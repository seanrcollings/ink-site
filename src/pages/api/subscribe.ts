import type { APIRoute } from "astro";
import { Resend } from "resend";
import { getRateLimitKey, checkRateLimit } from "../../lib/rateLimit";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // Rate limiting - IP-based (5 requests per minute)
  const ipRateLimitKey = getRateLimitKey(request, "ip");
  const ipRateLimit = checkRateLimit(ipRateLimitKey, 5, 60);

  if (!ipRateLimit.allowed) {
    const retryAfter = Math.ceil((ipRateLimit.resetTime - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": ipRateLimit.remaining.toString(),
          "X-RateLimit-Reset": new Date(ipRateLimit.resetTime).toISOString(),
        },
      }
    );
  }

  const runtime = locals.runtime;
  const { RESEND_API_KEY, RESEND_SEGMENT_ID } = runtime.env;

  // Validate environment variables
  if (!RESEND_API_KEY || !RESEND_SEGMENT_ID) {
    console.error("Missing Resend configuration");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    // Parse request body
    let body: { email?: string } = {};
    try {
      body = await request.json();
    } catch (parseError) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let { email } = body;

    // Validate email format
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalize email
    email = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Rate limiting - Email-based (2 requests per hour per email)
    const emailRateLimitKey = `email:${email}`;
    const emailRateLimit = checkRateLimit(emailRateLimitKey, 2, 3600);

    if (!emailRateLimit.allowed) {
      const retryAfter = Math.ceil(
        (emailRateLimit.resetTime - Date.now()) / 1000
      );
      return new Response(
        JSON.stringify({
          error:
            "This email has been used too many times recently. Please try again later.",
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": retryAfter.toString(),
          },
        }
      );
    }

    // Add subscriber to Resend segment
    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
    });

    // Add contact to segment if creation was successful
    if (result.data?.id) {
      try {
        await resend.contacts.segments.add({
          segmentId: RESEND_SEGMENT_ID,
          contactId: result.data?.id || "",
        });
      } catch (segmentError) {
        console.error("Failed to add contact to segment:", segmentError);
        // Continue - contact was created but segment assignment failed
        // This is not critical enough to fail the entire request
      }
    }

    // Resend returns error in result if subscription fails
    if ("error" in result && result.error) {
      console.error("Resend API error:", result.error);
      return new Response(
        JSON.stringify({ error: "Failed to subscribe. Please try again." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Successfully subscribed!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Subscription error:", error);

    // Check for rate limiting
    if (error instanceof Error && error.message.includes("rate limit")) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
