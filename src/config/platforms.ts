export interface Model {
    label: string;
    value: number | string;
    description?: string;
}

export interface Platform {
    id: string;
    name: string;
    displayName: string;
    icon: string;
    status: 'active' | 'coming-soon' | 'beta';
    models: Model[];
    color: string; // 品牌色
}

export const PLATFORMS: Record<string, Platform> = {
    GOOGLE_AI_STUDIO: {
        id: 'google-ai-studio',
        name: 'Google AI Studio',
        displayName: 'Google AI Studio',
        icon: '🌐',
        status: 'active',
        color: '#4285F4',
        models: [
            { label: 'Gemini 3 Flash Preview', value: 1 },
            { label: 'Gemini 3 Pro Preview', value: 2 },
            { label: 'Gemini 2.5 Pro', value: 3 },
            { label: 'Gemini 2.5 Flash', value: 4 },
        ]
    },
    OPENAI: {
        id: 'openai',
        name: 'OpenAI',
        displayName: 'OpenAI',
        icon: '🤖',
        status: 'coming-soon',
        color: '#10A37F',
        models: [
            { label: 'GPT-4o', value: 'gpt-4o' },
            { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
            { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
        ]
    },
    ANTHROPIC: {
        id: 'anthropic',
        name: 'Anthropic',
        displayName: 'Claude',
        icon: '🧠',
        status: 'active',
        color: '#CC9B7A',
        models: [
            { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022', description: '最新的 Claude 3.5 Sonnet 模型' },
            // { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229', description: '最强大的 Claude 3 模型' },
            // { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229', description: '平衡性能与成本' },
            // { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307', description: '最快速的 Claude 3 模型' },
        ]
    },
    DEEPSEEK: {
        id: 'deepseek',
        name: 'DeepSeek',
        displayName: 'DeepSeek',
        icon: '🚀',
        status: 'coming-soon',
        color: '#6366F1',
        models: [
            { label: 'DeepSeek V3', value: 'deepseek-v3' },
            { label: 'DeepSeek Coder', value: 'deepseek-coder' },
        ]
    },
    CUSTOM: {
        id: 'custom',
        name: 'Custom',
        displayName: 'Custom Platform',
        icon: '⚙️',
        status: 'coming-soon',
        color: '#8B5CF6',
        models: [
            { label: 'Custom Model', value: 'custom-model' },
        ]
    }
};

export const DEFAULT_PLATFORM = PLATFORMS.GOOGLE_AI_STUDIO;

// 获取平台状态显示文本
export const getPlatformStatusText = (status: Platform['status']) => {
    switch (status) {
        case 'active':
            return '';
        case 'beta':
            return 'Beta';
        case 'coming-soon':
            return 'Coming Soon';
        default:
            return '';
    }
};

// 获取所有平台列表（用于UI展示）
export const getAllPlatforms = (): Platform[] => {
    return Object.values(PLATFORMS);
};

// 根据ID获取平台
export const getPlatformById = (id: string): Platform | undefined => {
    return PLATFORMS[Object.keys(PLATFORMS).find(key => PLATFORMS[key].id === id) || ''];
};
