import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Create reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
        accessToken: process.env.GMAIL_ACCESS_TOKEN,
    },
});

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

        const info = await transporter.sendMail(mailOptions);
        return NextResponse.json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending email:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
} 