import axios from 'axios';

const API_HOST = _GLOBAL_VARS_.VITE_API_HOST;

const client = axios.create({
    baseURL: API_HOST || _GLOBAL_VARS_.VITE_APP_PROXY,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add driveid and auth token to every request
client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        // 在 hash 路由模式下，参数在 hash 后面，需要从 hash 中解析
        const hash = window.location.hash;
        const searchIndex = hash.indexOf('?');
        const search = searchIndex !== -1 ? hash.substring(searchIndex) : '';
        const params = new URLSearchParams(search);
        const driveId = params.get('driveid');
        if (driveId) {
            config.params = config.params || {};
            config.params.driveid = driveId;
        }

        // 从 localStorage 获取 token 并添加到请求头
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

client.interceptors.response.use(
    response => response.data,
    error => {
        const message = error.response?.data?.error || error.message || 'Unknown error';
        return Promise.reject(new Error(message));
    }
);
const formatPromot = (prompt: string) => {
    let promt = prompt+ '并满足条:不允许使用Gemini，不需要加入Gemini相关的内容包括GeminiService，我的应用不需要这个服务，同时默认是H5游戏';
    return prompt.replace(/\n/g, ' ').trim();
}
export const api = {
    saveApp: (id: string, files: Record<string, string>) => {
        return client.post('/api/apps', { id, files });
    },

    deployApp: (payload: { files?: Record<string, string>, appId?: string }) => {
        return client.post('/api/deploy', payload);
    },

    getApp: (id: string) => {
        return client.get(`/api/apps?id=${id}`);
    },

    generateCode: (prompt: string) => {
        return client.post('/api/generate', { prompt: formatPromot(prompt) });
    },
    getChatContent: (driveid: string) => {
        return client.get('/api/chatcontent', { params: { driveid } });
    },
    initChatContent: (prompt: string, model?: { label: string; value: number | string }, platformId?: string) => {
        return client.post('/api/initChatContent', {
            prompt: formatPromot(prompt),
            modelLabel: model?.label,
            modelValue: model?.value,
            platformId: platformId || 'google-ai-studio' // 默认使用 Google AI Studio
        });
    },
    sendChatMsg: (payload: { prompt: string, driveid: string, model?: { label: string; value: number } }) => {
        return client.post('/api/chatmsg', {
            ...payload,
            modelLabel: payload.model?.label,
            modelValue: payload.model?.value,
            model: undefined  // Remove the original model field
        });
    },
    deploywithcode: (data: any) => {
        return client.post('/api/deploywithcode', { data });
    },
    importFromUrl: (url: string) => {
        return client.post('/api/import', { url });
    },
    importFromFile: (file: File) => {
        const formData = new FormData();
        formData.append('zipFile', file);
        return client.post('/api/uploadzip', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    },
    getBuildRecord: () => {
        return client.get('/api/buildRecord');
    },
    // Track game click/play statistics
    trackGameClick: (gameId: string, sharedBy?: string) => {
        return client.post('/api/game/track', { gameId, sharedBy });
    },
    // Get game statistics
    getGameStats: (gameId: string) => {
        return client.get(`/api/game/stats/${gameId}`);
    },
    // Get batch game statistics
    getBatchGameStats: (gameIds: string[]) => {
        return client.post('/api/game/stats/batch', { gameIds });
    },

    // Stream APIs - 流式请求
    initChatContentStream: (prompt: string, model?: { label: string; value: number | string }, platformId?: string, onContent?: (content: string) => void, onComplete?: (data: any) => void, onError?: (error: string) => void) => {
        const params = new URLSearchParams();
        params.append('prompt', formatPromot(prompt));
        if (model?.label) params.append('modelLabel', model.label);
        if (platformId) params.append('platformId', platformId);

        const url = `${API_HOST || _GLOBAL_VARS_.VITE_APP_PROXY}/api/initChatContent/stream?${params.toString()}`;

        // Add driveid and auth token to URL
        if (typeof window !== 'undefined') {
            const hash = window.location.hash;
            const searchIndex = hash.indexOf('?');
            const search = searchIndex !== -1 ? hash.substring(searchIndex) : '';
            const urlParams = new URLSearchParams(search);
            const driveId = urlParams.get('driveid');
            if (driveId) {
                params.append('driveid', driveId);
            }
        }

        const eventSource = new EventSource(url);

        eventSource.addEventListener('content', (event) => {
            const data = JSON.parse(event.data);
            if (onContent) onContent(data.content);
        });

        eventSource.addEventListener('driveid', (event) => {
            const data = JSON.parse(event.data);
            console.log('Received driveid:', data.driveid);
        });

        eventSource.addEventListener('complete', (event) => {
            const data = JSON.parse(event.data);
            if (onComplete) onComplete(data);
            eventSource.close();
        });

        eventSource.addEventListener('error', (event: any) => {
            console.error('SSE Error:', event);
            if (event.data) {
                try {
                    const data = JSON.parse(event.data);
                    if (onError) onError(data.error);
                } catch (e) {
                    if (onError) onError('Stream connection error');
                }
            } else {
                if (onError) onError('Stream connection error');
            }
            eventSource.close();
        });

        return eventSource;
    },

    sendChatMsgStream: (payload: { prompt: string, driveid: string, model?: { label: string; value: number } }, onContent?: (content: string) => void, onComplete?: (data: any) => void, onError?: (error: string) => void) => {
        const params = new URLSearchParams();
        params.append('prompt', payload.prompt);
        params.append('driveid', payload.driveid);
        if (payload.model?.label) params.append('modelLabel', payload.model.label);

        const url = `${API_HOST || _GLOBAL_VARS_.VITE_APP_PROXY}/api/chatmsg/stream?${params.toString()}`;

        const eventSource = new EventSource(url);

        eventSource.addEventListener('content', (event) => {
            const data = JSON.parse(event.data);
            if (onContent) onContent(data.content);
        });

        eventSource.addEventListener('complete', (event) => {
            const data = JSON.parse(event.data);
            if (onComplete) onComplete(data);
            eventSource.close();
        });

        eventSource.addEventListener('error', (event: any) => {
            console.error('SSE Error:', event);
            if (event.data) {
                try {
                    const data = JSON.parse(event.data);
                    if (onError) onError(data.error);
                } catch (e) {
                    if (onError) onError('Stream connection error');
                }
            } else {
                if (onError) onError('Stream connection error');
            }
            eventSource.close();
        });

        return eventSource;
    },

    // Project APIs - 项目管理
    // 创建项目
    createProject: (projectData: any) => {
        return client.post('/api/projects', projectData);
    },
    // 更新项目
    updateProject: (id: string, projectData: any) => {
        return client.put(`/api/projects/${id}`, projectData);
    },
    // 创建或更新项目（兼容方法）
    saveProject: (projectData: any) => {
        return client.post('/api/projects/save', projectData);
    },
    // 获取单个项目
    getProject: (id: string) => {
        return client.get(`/api/projects/${id}`);
    },
    // 根据 driveid 获取项目
    getProjectByDriveid: (driveid: string) => {
        return client.get(`/api/projects/by-driveid/${driveid}`);
    },
    // 获取项目列表
    getProjects: (params?: { status?: string; limit?: number; offset?: number }) => {
        return client.get('/api/projects', { params });
    },
    // 删除项目
    deleteProject: (id: string) => {
        return client.delete(`/api/projects/${id}`);
    },
    // 批量迁移项目
    migrateProjects: (projects: any[]) => {
        return client.post('/api/projects/migrate', { projects });
    },

    // CodeGen APIs - 代码生成（新架构，使用 Vercel AI SDK）
    // 初始化代码生成会话（非流式）
    codegenInit: (payload: {
        prompt: string;
        modelId: string;
        projectId?: string;
        currentPage?: string;
    }) => {
        return client.post('/api/codegen/init', payload);
    },

    // 初始化代码生成会话（流式）
    codegenInitStream: (
        payload: {
            prompt: string;
            modelId: string;
            projectId?: string;
            currentPage?: string;
        },
        onInit?: (data: { chatId: string; sessionId: string; model: string }) => void,
        onContent?: (content: string) => void,
        onComplete?: (data: any) => void,
        onError?: (error: string) => void,
        onThinking?: (thinking: string) => void,
        onCode?: (fileName: string, progress: number) => void
    ) => {
        const token = localStorage.getItem('auth_token');
        const url = `${API_HOST || _GLOBAL_VARS_.VITE_APP_PROXY}/api/codegen/init`;

        console.log('[API] Calling codegenInitStream:', url, payload);

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ ...payload, stream: true })
        }).then(response => {
            console.log('[API] Response status:', response.status, response.statusText);

            if (!response.ok) {
                return response.text().then(text => {
                    console.error('[API] Error response:', text);
                    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
                });
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            const readStream = () => {
                reader?.read().then(({ done, value }) => {
                    if (done) return;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));

                                if (data.type === 'init' && onInit) {
                                    onInit(data);
                                } else if (data.type === 'think' && onThinking) {
                                    onThinking(data.content);
                                } else if (data.type === 'code' && onCode) {
                                    onCode(data.fileName, data.progress ?? 0);
                                } else if (data.type === 'text' && onContent) {
                                    // 兼容旧格式
                                    onContent(data.content);
                                } else if (data.type === 'thinking' && onThinking) {
                                    // 兼容旧格式
                                    onThinking(data.content);
                                } else if (data.type === 'complete' && onComplete) {
                                    onComplete(data.data);
                                } else if (data.type === 'error' && onError) {
                                    onError(data.error);
                                }
                            } catch (e) {
                                console.error('Parse SSE error:', e);
                            }
                        }
                    });

                    readStream();
                }).catch(error => {
                    if (onError) onError(error.message);
                });
            };

            readStream();
        }).catch(error => {
            if (onError) onError(error.message);
        });
    },

    // 继续代码生成对话（非流式）
    codegenChat: (payload: {
        chatId: string;
        prompt: string;
        modelId?: string;
        projectId?: string;
        currentPage?: string;
    }) => {
        return client.post('/api/codegen/chat', payload);
    },

    // 继续代码生成对话（流式）
    codegenChatStream: (
        payload: {
            chatId: string;
            prompt: string;
            modelId?: string;
            projectId?: string;
            currentPage?: string;
        },
        onContent?: (content: string) => void,
        onComplete?: (data: any) => void,
        onError?: (error: string) => void,
        onThinking?: (thinking: string) => void,
        onCode?: (fileName: string, progress: number) => void
    ) => {
        const token = localStorage.getItem('auth_token');
        const url = `${API_HOST || _GLOBAL_VARS_.VITE_APP_PROXY}/api/codegen/chat`;

        console.log('[API] Calling codegenChatStream:', url, payload);

        return fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ ...payload, stream: true })
        }).then(response => {
            console.log('[API] Response status:', response.status, response.statusText);

            if (!response.ok) {
                return response.text().then(text => {
                    console.error('[API] Error response:', text);
                    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
                });
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            const readStream = () => {
                reader?.read().then(({ done, value }) => {
                    if (done) return;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.substring(6));

                                if (data.type === 'think' && onThinking) {
                                    onThinking(data.content);
                                } else if (data.type === 'code' && onCode) {
                                    onCode(data.fileName, data.progress ?? 0);
                                } else if (data.type === 'text' && onContent) {
                                    // 兼容旧格式
                                    onContent(data.content);
                                } else if (data.type === 'thinking' && onThinking) {
                                    // 兼容旧格式
                                    onThinking(data.content);
                                } else if (data.type === 'complete' && onComplete) {
                                    onComplete(data.data);
                                } else if (data.type === 'error' && onError) {
                                    onError(data.error);
                                }
                            } catch (e) {
                                console.error('Parse SSE error:', e);
                            }
                        }
                    });

                    readStream();
                }).catch(error => {
                    if (onError) onError(error.message);
                });
            };

            readStream();
        }).catch(error => {
            if (onError) onError(error.message);
        });
    },

    // 获取支持的模型列表
    codegenGetModels: () => {
        return client.get('/api/codegen/models');
    },

    // 获取聊天历史
    codegenGetHistory: (chatId: string) => {
        return client.get('/api/codegen/history', { params: { chatId } });
    },

    // 获取统计信息
    codegenGetStats: (chatId: string) => {
        return client.get('/api/codegen/stats', { params: { chatId } });
    },

    // 删除聊天
    codegenDeleteChat: (chatId: string) => {
        return client.delete(`/api/codegen/chat/${chatId}`);
    },

    // 获取用户的所有对话列表
    codegenGetUserChats: (params?: { limit?: number; offset?: number }) => {
        return client.get('/api/codegen/chats', { params });
    }
};
