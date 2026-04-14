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
    return f"""Tu es un expert en rédaction de CV et lettres de motivation professionnels.

Instructions personnalisées de l'utilisateur :
{user_instructions or "Aucune instruction spécifique."}

Offre d'emploi cible :
- Poste : {job_title}
- Entreprise : {company}
- Description : {job_description[:800] if job_description else "Non fournie"}

Template de référence (adapte la structure mais pas le contenu verbatim) :
{template_content[:3000] if template_content else "Aucun template fourni, utilise un format standard."}

Langue de rédaction : {language}

Génère un(e) {doc_label} adapté(e) à cette offre d'emploi. Respecte les instructions de l'utilisateur. Sois concis et professionnel."""


async def stream_generation(prompt: str) -> AsyncIterator[str]:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    async with client.messages.stream(
        model="claude-opus-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text
