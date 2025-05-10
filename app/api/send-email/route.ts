export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Function to refresh the access token
async function refreshAccessToken() {
    try {
        console.log('Attempting to refresh access token...');
        console.log('Using credentials:', {
            clientId: process.env.GOOGLE_CLIENT_ID ? 'present' : 'missing',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'present' : 'missing',
            refreshToken: process.env.GOOGLE_REFRESH_TOKEN ? 'present' : 'missing',
        });

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
                grant_type: 'refresh_token',
            }),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error('Token refresh failed:', {
                status: response.status,
                statusText: response.statusText,
                error: responseData,
            });
            throw new Error(`Failed to refresh access token: ${responseData.error_description || responseData.error || 'Unknown error'}`);
        }

        console.log('Token refresh successful');
        return responseData.access_token;
    } catch (error) {
        console.error('Error refreshing access token:', error);
        throw error;
    }
}

// Create reusable transporter object using Gmail SMTP
let transporter: nodemailer.Transporter;

async function getTransporter() {
    if (!transporter) {
        console.log('Creating new transporter...');
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.GMAIL_USER,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                accessToken: process.env.GMAIL_ACCESS_TOKEN,
            },
        });
    }
    return transporter;
}

export async function POST(request: Request) {
    try {
        const { type, userEmail, userName } = await request.json();

        if (!userEmail || !userName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        let mailOptions;
        if (type === 'approval') {
            mailOptions = {
                from: process.env.GMAIL_USER,
                to: userEmail,
                subject: 'Your Registration Has Been Approved!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #2563eb;">Welcome to Our Platform!</h2>
                        <p>Dear ${userName},</p>
                        <p>We're excited to inform you that your registration has been approved. You can now access all features of our platform.</p>
                        <p>To get started, simply log in to your account at:</p>
                        <p style="margin: 20px 0;">
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" 
                               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                                Log In Now
                            </a>
                        </p>
                        <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                        <p>Best regards,<br>The Team</p>
                    </div>
                `,
            };
        } else if (type === 'rejection') {
            mailOptions = {
                from: process.env.GMAIL_USER,
                to: userEmail,
                subject: 'Registration Status Update',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">Registration Status Update</h2>
                        <p>Dear ${userName},</p>
                        <p>We regret to inform you that your registration request has not been approved at this time.</p>
                        <p>If you believe this is an error or would like to appeal this decision, please contact our support team.</p>
                        <p>Best regards,<br>The Team</p>
                    </div>
                `,
            };
        } else {
            return NextResponse.json(
                { error: 'Invalid email type' },
                { status: 400 }
            );
        }

        // Get the transporter
        const transporter = await getTransporter();

        try {
            // Try to send the email
            console.log('Attempting to send email...');
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return NextResponse.json({ success: true, messageId: info.messageId });
        } catch (error: any) {
            // If the error is due to an expired token, refresh it and try again
            if (error.code === 'EAUTH' || error.message?.includes('invalid_grant')) {
                console.log('Access token expired, refreshing...');
                const newAccessToken = await refreshAccessToken();
                // Update the transporter with the new access token
                console.log('Updating transporter with new access token...');
                (transporter as any).options.auth = {
                    ...(transporter as any).options.auth,
                    accessToken: newAccessToken,
                };
                // Try sending the email again with the new token
                console.log('Retrying email send with new token...');
                const info = await transporter.sendMail(mailOptions);
                console.log('Email sent successfully after token refresh:', info.messageId);
                return NextResponse.json({ success: true, messageId: info.messageId });
            }
            console.error('Error sending email:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error in email service:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
} 