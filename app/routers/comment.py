"""AI comment endpoint."""

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AIComment, FaceAnalysis, Hairstyle, Image
from app.schemas import AICommentOut, AICommentRequest, success_response
from app.services.llm import get_llm_provider

router = APIRouter(prefix="/api/v1", tags=["AI Comment"])

# ---------------------------------------------------------------------------
# Personality prompt templates
# ---------------------------------------------------------------------------

_PERSONALITY_PROMPTS = {
    "warm_bestie": {
        "name": "温柔闺蜜",
        "system": (
            "你是一位温柔体贴的闺蜜造型师，说话亲切温暖，像好朋友一样给出建议。\n"
            "语气特点：温和鼓励、共情、建议式语气，多用 emoji，像在和闺蜜聊天。\n"
            "避免说教，多用\"亲爱的\"\"宝贝\"\"姐妹\"等亲切称呼。\n"
        ),
    },
    "sassy_stylist": {
        "name": "毒舌造型师",
        "system": (
            "你是一位犀利直白的毒舌造型师，点评一针见血，自带段子手属性。\n"
            "语气特点：犀利但不伤人，吐槽中带关心，幽默风趣，偶尔押韵。\n"
            "像综艺节目的造型点评嘉宾，让人笑着接受建议。\n"
        ),
    },
    "knowledge_blogger": {
        "name": "知识型博主",
        "system": (
            "你是一位专业的美发知识博主，擅长用专业术语分析发型，分享护发知识。\n"
            "语气特点：专业严谨但不枯燥，会引用流行趋势、发质科学、脸型美学知识。\n"
            "像在小红书/抖音发干货帖的 KOL，有理有据有深度。\n"
        ),
    },
}

_SCORE_DIMENSIONS = [
    ("face_match", "脸型适配度", "分析该发型与用户脸型的匹配程度，结合脸型特征给出评分理由"),
    ("hair_quality", "发质匹配度", "评估该发型对用户当前发质的适配性，是否容易打理和维护"),
    ("style", "风格气质匹配度", "判断发型风格与用户整体气质、年龄、身份的契合度"),
    ("emotion", "情绪价值", "预测换了这个发型后给用户带来的心情提升和自信加成"),
    ("knowledge", "专业冷知识", "分享一个关于这款发型的专业小知识或流行趋势"),
    ("humor", "幽默互动", "用一个轻松有趣的方式和用户互动，可以是调侃、段子或趣味观察"),
]


def _build_multimodal_comment_prompt(
    face_shape: str | None,
    hairstyle_name: str | None,
    hairstyle_info: str | None,
    personality_type: str,
) -> str:
    personality = _PERSONALITY_PROMPTS.get(personality_type, _PERSONALITY_PROMPTS["warm_bestie"])

    prompt_parts = [
        f"系统设定：{personality['system']}",
        "",
        "你正在为用户做发型点评。用户上传了自己的照片，并选择了目标发型。",
        "请同时查看用户的原照片和目标发型的参考图，给出专业的造型点评。",
        "",
    ]

    if face_shape:
        prompt_parts.append(f"用户脸型分析结果：{face_shape}")
    if hairstyle_name:
        prompt_parts.append(f"目标发型名称：{hairstyle_name}")
    if hairstyle_info:
        prompt_parts.append(f"发型信息：{hairstyle_info}")

    prompt_parts.extend([
        "",
        "请严格按照以下六维评分体系给出点评，每个维度 1-10 分，并附上一段评语：",
    ])
    for key, name, desc in _SCORE_DIMENSIONS:
        prompt_parts.append(f"  {key} ({name})：{desc}")

    prompt_parts.extend([
        "",
        "最终输出必须是严格的 JSON 格式，不要包含 markdown 代码块标记，只返回纯 JSON：",
        json.dumps({
            "personality": personality_type,
            "scores": {key: "整数 1-10" for key, _, _ in _SCORE_DIMENSIONS},
            "comment": "整体点评正文（约 200-400 字，符合人格语气）",
            "highlights": ["亮点 1（15 字以内）", "亮点 2（15 字以内）"],
            "tip": "一条实用的护发或造型小贴士（30-60 字）",
        }, ensure_ascii=False, indent=2),
    ])

    return "\n".join(prompt_parts)


def _parse_comment_json(raw: str) -> dict:
    """Extract and parse JSON from LLM response."""
    # Try to find JSON in markdown code blocks
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", raw)
    if code_block_match:
        raw = code_block_match.group(1)

    # Try direct parse
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass

    # Try to find the outermost JSON object
    obj_match = re.search(r"(\{[\s\S]*\})", raw)
    if obj_match:
        try:
            return json.loads(obj_match.group(1))
        except json.JSONDecodeError:
            pass

    # Fallback: return empty structure
    return {}


def _extract_overall_rating(scores: dict | None) -> int | None:
    """Compute overall rating from six dimension scores."""
    if not scores:
        return None
    values = [scores.get(k) for k, _, _ in _SCORE_DIMENSIONS]
    valid = [v for v in values if isinstance(v, (int, float))]
    if not valid:
        return None
    return round(sum(valid) / len(valid))


@router.post("/ai-comment")
async def ai_comment(
    request: AICommentRequest,
    db: Session = Depends(get_db),
) -> dict:
    """Generate AI stylist comment for the user's look using multimodal LLM."""
    image = db.query(Image).filter(Image.id == request.image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    face_analysis = db.query(FaceAnalysis).filter(FaceAnalysis.image_id == request.image_id).first()
    face_shape = face_analysis.face_shape if face_analysis else None

    hairstyle_name = None
    hairstyle_image_url = None
    if request.hairstyle_id:
        hairstyle = db.query(Hairstyle).filter(Hairstyle.id == request.hairstyle_id).first()
        if hairstyle:
            hairstyle_name = hairstyle.name
            hairstyle_image_url = hairstyle.cover_image_url or hairstyle.thumbnail_url

    prompt = _build_multimodal_comment_prompt(
        face_shape=face_shape,
        hairstyle_name=hairstyle_name,
        hairstyle_info=request.hairstyle_info,
        personality_type=request.personality_type,
    )

    # Prepare images for multimodal input
    images: list[bytes | str] = []

    # User's original photo
    if image.storage_url:
        # If it's a local path mounted as static, construct URL; otherwise use as-is
        if image.storage_url.startswith("http"):
            images.append(image.storage_url)
        else:
            # Try to read local file
            import os
            local_path = os.path.join(image.storage_url) if os.path.isabs(image.storage_url) else image.storage_url
            if os.path.exists(local_path):
                with open(local_path, "rb") as f:
                    images.append(f.read())

    # Target hairstyle reference image
    if hairstyle_image_url:
        if hairstyle_image_url.startswith("http"):
            images.append(hairstyle_image_url)
        else:
            import os
            if os.path.exists(hairstyle_image_url):
                with open(hairstyle_image_url, "rb") as f:
                    images.append(f.read())

    llm = get_llm_provider()
    raw_response = await llm.generate_text_with_images(prompt, images)

    parsed = _parse_comment_json(raw_response)

    scores = parsed.get("scores")
    rating = _extract_overall_rating(scores)

    comment = AIComment(
        image_id=request.image_id,
        hairstyle_id=request.hairstyle_id,
        hairstyle_info=request.hairstyle_info,
        personality=request.personality_type,
        comment_text=parsed.get("comment", raw_response),
        scores=json.dumps(scores, ensure_ascii=False) if scores else None,
        rating=rating,
        highlights=json.dumps(parsed.get("highlights", []), ensure_ascii=False) if parsed.get("highlights") else None,
        tip=parsed.get("tip"),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return success_response(data=AICommentOut.model_validate(comment))
