import anthropic
from collections.abc import AsyncIterator
from app.config import settings


def build_prompt(
    job_title: str,
    company: str,
    doc_type: str,
    language: str,
    user_instructions: str,
    template_content: str,
    job_description: str = "",
) -> str:
    doc_label = "CV" if doc_type == "cv" else "lettre de motivation"
    instructions = user_instructions or "Aucune instruction spécifique."
    description = job_description[:800] if job_description else "Non fournie"
    no_tmpl = "Aucun template fourni, utilise un format standard."
    template_section = template_content[:3000] if template_content else no_tmpl
    closing = (
        f"Génère un(e) {doc_label} adapté(e) à cette offre d'emploi."
        " Respecte les instructions de l'utilisateur. Sois concis et professionnel."
    )
    return (
        "Tu es un expert en rédaction de CV et lettres de motivation professionnels.\n\n"
        f"Instructions personnalisées de l'utilisateur :\n{instructions}\n\n"
        "Offre d'emploi cible :\n"
        f"- Poste : {job_title}\n"
        f"- Entreprise : {company}\n"
        f"- Description : {description}\n\n"
        "Template de référence"
        " (adapte la structure mais pas le contenu verbatim) :\n"
        f"{template_section}\n\n"
        f"Langue de rédaction : {language}\n\n"
        f"{closing}"
    )


async def stream_generation(prompt: str) -> AsyncIterator[str]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    async with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text
