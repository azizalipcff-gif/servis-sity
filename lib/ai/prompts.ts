export function buildSearchMatchPrompt(query: string, businessesJson: string) {
  return `You are a search assistant for a local services platform.
The customer wrote: "${query}"
Here is the list of available businesses (JSON): ${businessesJson}
Return the best 3 suggestions, ordered, with a short reason (one sentence) for each, in the same language as the question.
Return only JSON: [{"business_id": "...", "reason": "..."}]`;
}

export function buildFilterParsePrompt(query: string) {
  return `You convert a customer's natural-language search into structured JSON filters for a Moroccan local-services marketplace.

Allowed category slugs: electricien, plombier, restaurant, coiffeur, mecanicien, menuiserie, peintre, pharmacie, medecin, dentiste, avocat, transport, nettoyage, immobilier, scolaire.
Known cities: Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir, Meknès, Oujda, Kenitra, Tétouan, Salé, Mohammedia, El Jadida, Nador, Béni Mellal, Laâyoune, Dakhla, Essaouira, Taza, Safi.

Customer wrote: "${query}"

Return ONLY JSON matching this shape:
{
  "q": "cleaned search term without filters",
  "category": "one allowed slug or null",
  "city": "one known city name or null",
  "minRating": number between 1 and 5 or null,
  "verifiedOnly": boolean,
  "premiumOnly": boolean,
  "openNow": boolean
}`;
}

export function buildDescriptionPrompt(input: {
  name: string;
  category: string;
  city: string;
  services: string[];
}) {
  return `You are a marketing copywriter. Write a professional and attractive description (60-90 words) for a business
named "${input.name}", category "${input.category}", city "${input.city}", services: ${input.services.join(", ")}.
Tone: trustworthy and professional, no exaggeration. Write the version in 3 languages: Arabic (simple Modern Standard), French, English.
Return JSON: {"ar": "...", "fr": "...", "en": "..."}`;
}

export function buildReviewReplyPrompt(rating: number, comment: string) {
  return `You are a business owner politely replying to a customer review.
Review: ${rating}/5. Comment: "${comment}"
Write a short reply (2-3 sentences), thanking if positive, apologizing and offering a solution if negative.
In the same language as the comment.`;
}

export function buildSocialPostPrompt(input: {
  name: string;
  category: string;
  city: string;
  offer: string;
}) {
  return `Write a short Facebook/Instagram post (with relevant Hashtags) promoting "${input.name}"
(${input.category} in ${input.city}). Offer/news: "${input.offer}". Tone: enthusiastic but not exaggerated.`;
}
