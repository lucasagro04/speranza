export const dynamic = 'force-dynamic';

interface NotificationRequest {
  email: string;
  eventName: string;
  mapName: string;
  duration: string;
  endTime: string;
}

export async function POST(request: Request) {
  try {
    const body: NotificationRequest = await request.json();
    const { email, eventName, mapName, duration, endTime } = body;

    // Resend API key from environment variables
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: 'Resend API key not configured' },
        { status: 500 }
      );
    }

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Arc Raiders Alerts <onboarding@resend.dev>',
        to: email,
        subject: `🎮 ${eventName} is LIVE on ${mapName}!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0a0a0a; color: #fff;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%); border-radius: 12px; padding: 30px; border: 2px solid #333;">
              <h1 style="color: #22c55e; margin: 0 0 20px 0; font-size: 28px;">🎮 Arc Raiders Alert!</h1>
              
              <div style="background: #1a1a1a; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
                <h2 style="color: #fff; margin: 0 0 15px 0; font-size: 24px;">${eventName}</h2>
                <p style="color: #a3a3a3; margin: 0 0 10px 0; font-size: 16px;">
                  <strong style="color: #fff;">Map:</strong> ${mapName}
                </p>
                <p style="color: #a3a3a3; margin: 0 0 10px 0; font-size: 16px;">
                  <strong style="color: #fff;">Duration:</strong> ${duration}
                </p>
                <p style="color: #a3a3a3; margin: 0; font-size: 16px;">
                  <strong style="color: #fff;">Ends at:</strong> ${endTime}
                </p>
              </div>
              
              <div style="background: #ef4444; color: #fff; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; margin-top: 20px;">
                🔥 LIVE NOW - JOIN THE RAID!
              </div>
              
              <p style="color: #737373; font-size: 12px; margin-top: 30px; text-align: center;">
                Good luck, Raider! 🚀
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', error);
      return Response.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    const result = await response.json();
    return Response.json({ success: true, messageId: (result as { id?: string }).id });
  } catch (error) {
    console.error("Email notification error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to send notification";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
