export type ApplicationStatus = "pending" | "approved" | "rejected" | "review_requested"

export type Application = {
    id: string
    title: string
    description: string
    url: string
    screenshot_url: string
    tags: string[]
    creator_id: string
    status: ApplicationStatus
    created_at: string
    profiles?: {
        email: string
        name?: string
        avatar_url?: string
    }
    stars?: number
    isStarred?: boolean
}

export type Like = {
    id: string
    application_id: string
    user_id: string
    created_at: string
}

// Add NextAuth types
import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}

export type NotificationType = 'like' | 'comment' | 'approval' | 'rejection' | 'star';

export type Notification = {
    id: string;
    user_id: string;
    type: NotificationType;
    title: string;
    message: string;
    read: boolean;
    created_at: string;
    application_id?: string;
    action_user_id?: string;
}; 