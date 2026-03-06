export type SduiBlockStatus = 'stable' | 'beta' | 'deprecated';

export interface SduiBlock {
    id: number;
    name: string;
    type: string;
    description?: string;
    status: SduiBlockStatus;
    sample_payload: any;
    warnings?: any;
}

export interface SduiLayout {
    id: number;
    slug: string;
    name: string;
    layout_type: string;
    blocks_json: string;
    status: 'draft' | 'live' | 'archived';
    created_at: string;
    updated_at: string;
}

export interface SduiSnapshot {
    id: number;
    tag: string;
    description?: string;
    full_config_json: string;
    created_at: string;
}

export interface SduiTarget {
    id: number;
    name: string;
    priority: number;
    condition_type: 'user_id' | 'role' | 'platform' | 'device_type' | 'app_version';
    condition_value: any;
    layout_slug: string;
    is_active: boolean;
}
