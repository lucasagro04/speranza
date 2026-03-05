export const dynamic = 'force-dynamic';

interface Event {
  name: string;
  map: string;
  startTime: number;
  endTime: number;
}

export async function POST(request: Request) {
  try {
    const { email, notifiedEvents = [] } = await request.json();

    if (!email) {
      return Response.json({ events: [], notifiedEvents });
    }

    // Fetch current events
    const eventsResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/events`);
    const eventsData = await eventsResponse.json();
    const events: Event[] = eventsData.data || [];

    const now = Date.now();
    const favorites: Event[] = [];
    const newNotifications: string[] = [];

    // Check for favorite events that just started (within last 2 minutes)
    for (const event of events) {
      const name = event.name.toLowerCase();
      const map = event.map.toLowerCase();
      
      // Check if it's a favorite
      const isFavorite = 
        name.includes('matriarch') || 
        name.includes('harvester') ||
        (name.includes('night raid') && map.includes('dam'));

      if (!isFavorite) continue;

      // Check if event just started (active and started within last 2 minutes)
      const isActive = now >= event.startTime && now < event.endTime;
      const justStarted = isActive && (now - event.startTime < 2 * 60 * 1000);

      if (justStarted) {
        const eventId = `${event.name}-${event.map}-${event.startTime}`;
        
        // Only notify if we haven't notified for this event yet
        if (!notifiedEvents.includes(eventId)) {
          favorites.push(event);
          newNotifications.push(eventId);
        }
      }
    }

    // Send email for each new favorite event
    for (const event of favorites) {
      const duration = Math.floor((event.endTime - event.startTime) / (60 * 1000));
      const endTime = new Date(event.endTime).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          eventName: event.name,
          mapName: event.map,
          duration: `${duration} minutes`,
          endTime,
        }),
      });
    }

    return Response.json({
      success: true,
      notified: favorites.length,
      notifiedEvents: [...notifiedEvents, ...newNotifications],
    });
  } catch (error) {
    console.error("Notification check error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to check notifications";
    return Response.json(
      { error: message, notifiedEvents: [] },
      { status: 500 }
    );
  }
}
