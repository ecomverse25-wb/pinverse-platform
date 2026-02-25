// ─── Blog Monetizer Types ───

export type Tone = 'conversational' | 'authoritative' | 'storytelling' | 'listicle' | 'how-to';
export type ArticleLength = 'short' | 'standard' | 'long';
export type H2Count = 3 | 5 | 7;

export type ImageStyle =
    | 'lifestyle'
    | 'flat-lay'
    | 'editorial'
    | 'interior'
    | 'food'
    | 'minimalist'
    | 'warm-cozy'
    | 'custom';

export type ImageDimensions = '1024x1536' | '1536x864' | '1024x1024';

export interface AffiliateLink {
    productName: string;
    url: string;
}

export interface ParsedKeyword {
    text: string;
    checked: boolean;
    generatedTitle?: string;
}

export interface FeaturedImageSettings {
    promptTemplate: string;
    style: ImageStyle;
    colorMood: string;
    dimensions: ImageDimensions;
}

export interface BlogMonetizerSettings {
    niche: string;
    tone: Tone;
    articleLength: ArticleLength;
    h2Count: H2Count;
    affiliateLinks: AffiliateLink[];
    featuredImage: FeaturedImageSettings;
}

export interface SectionImage {
    h2Index: number;
    h2Title: string;
    imageUrl: string;
    prompt?: string;
}

export interface BlogArticle {
    keyword: string;
    title: string;
    content: string; // full HTML
    metaDescription: string;
    wordCount: number;
    featuredImageUrl?: string;
    featuredImagePrompt?: string;
    sectionImages: SectionImage[];
    status: 'pending' | 'generating' | 'ready' | 'error' | 'published';
    errorMessage?: string;
    wpLink?: string;
    wpPostId?: number;
}

export interface PinData {
    imageUrl: string;
    title: string;
    description: string;
    destinationUrl: string;
    sourceArticleKeyword: string;
    type: 'featured' | 'section';
}

export interface WPCredentials {
    url: string;
    user: string;
    password: string;
}

export const DEFAULT_IMAGE_PROMPT_TEMPLATE = `You are a professional visual art director for a top lifestyle blog.
Analyze this article and create a stunning featured image prompt.

Article Title: {title}
Article Content Summary: {content}

Generate a detailed image prompt that:
- Captures the OVERALL theme of the entire article, not just one section
- Uses lifestyle photography style: warm, natural, aspirational
- Includes specific scene details: lighting, composition, mood, colors
- Is optimized for Pinterest (portrait, visually striking)
- Avoids text, logos, faces, or watermarks
- Feels editorial and magazine-quality

Output ONLY the image generation prompt, nothing else.
Make it 2-3 sentences, highly descriptive and specific.`;

export const IMAGE_STYLE_SUFFIXES: Record<ImageStyle, string> = {
    'lifestyle': ', professional lifestyle photography, natural lighting, Canon 5D quality, shallow depth of field',
    'flat-lay': ', overhead flat lay shot, white background, perfectly arranged composition, studio lighting',
    'editorial': ', editorial magazine photography, Elle Decor style, dramatic lighting, high contrast',
    'interior': ', interior design photography, Architectural Digest style, wide angle, perfect symmetry, golden hour light',
    'food': ', food photography, warm tones, rustic wood surface, steam rising, appetizing and inviting',
    'minimalist': ', minimalist photography, clean white background, negative space, single hero element, sharp focus',
    'warm-cozy': ', cozy atmosphere, warm amber tones, bokeh background, hygge aesthetic, soft candlelight',
    'custom': '',
};

export const IMAGE_STYLE_OPTIONS: { value: ImageStyle; label: string }[] = [
    { value: 'lifestyle', label: '📸 Lifestyle Photography' },
    { value: 'flat-lay', label: '🎨 Flat Lay / Overhead Shot' },
    { value: 'editorial', label: '🌿 Editorial / Magazine Style' },
    { value: 'interior', label: '🏠 Interior Design / Decor' },
    { value: 'food', label: '🍳 Food & Kitchen' },
    { value: 'minimalist', label: '✨ Minimalist / Clean' },
    { value: 'warm-cozy', label: '🌅 Warm & Cozy Atmosphere' },
    { value: 'custom', label: '🖼️ Custom (prompt only)' },
];

export const IMAGE_DIMENSION_OPTIONS: { value: ImageDimensions; label: string; ratio: string }[] = [
    { value: '1024x1536', label: '📌 Pinterest Portrait 2:3', ratio: '2:3' },
    { value: '1536x864', label: '🖥️ Blog Header 16:9', ratio: '16:9' },
    { value: '1024x1024', label: '⬜ Square 1:1', ratio: '1:1' },
];

export const TONE_OPTIONS: { value: Tone; label: string }[] = [
    { value: 'conversational', label: 'Conversational' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'storytelling', label: 'Storytelling' },
    { value: 'listicle', label: 'Listicle' },
    { value: 'how-to', label: 'How-To Guide' },
];

export const ARTICLE_LENGTH_OPTIONS: { value: ArticleLength; label: string; words: string }[] = [
    { value: 'short', label: 'Short', words: '~800 words' },
    { value: 'standard', label: 'Standard', words: '~1500 words' },
    { value: 'long', label: 'Long', words: '~2500 words' },
];

export const H2_COUNT_OPTIONS: H2Count[] = [3, 5, 7];

export const DEFAULT_SETTINGS: BlogMonetizerSettings = {
    niche: '',
    tone: 'conversational',
    articleLength: 'standard',
    h2Count: 5,
    affiliateLinks: [],
    featuredImage: {
        promptTemplate: DEFAULT_IMAGE_PROMPT_TEMPLATE,
        style: 'lifestyle',
        colorMood: '',
        dimensions: '1024x1536',
    },
};
