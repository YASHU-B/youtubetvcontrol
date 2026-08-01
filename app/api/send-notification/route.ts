import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { adminMessaging } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
    try {
        const { title, body } = await request.json();
        
        if (!title || !body) {
            return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
        }

        // Fetch all tokens from Supabase
        const { data, error } = await supabase.from('fcm_tokens').select('token');
        if (error) throw error;

        const tokens = data?.map(t => t.token) || [];
        if (tokens.length === 0) {
            return NextResponse.json({ success: true, count: 0, message: 'No registered tokens found' });
        }

        // Send multicast push message
        const response = await adminMessaging.sendEachForMulticast({
            tokens,
            notification: {
                title,
                body,
            },
            webpush: {
                notification: {
                    title,
                    body,
                    icon: '/favicon.ico',
                }
            }
        });

        // Identify expired or invalid tokens for auto-cleanup
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (
                    errorCode === 'messaging/registration-token-not-registered' || 
                    errorCode === 'messaging/invalid-registration-token'
                ) {
                    failedTokens.push(tokens[idx]);
                }
            }
        });

        if (failedTokens.length > 0) {
            await supabase.from('fcm_tokens').delete().in('token', failedTokens);
        }

        return NextResponse.json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            totalTokens: tokens.length
        });
    } catch (error: any) {
        console.error('Error sending push notification:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
