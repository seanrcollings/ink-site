import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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

    // Add subscriber to Resend segment
    const result = await resend.contacts.create({
      email,
      unsubscribed: false,
    });

    console.log(result);

    // Add contact to segment if creation was successful
    if (result.data?.id) {
      try {
        const segmentResult = await resend.contacts.segments.add({
          segmentId: RESEND_SEGMENT_ID,
          contactId: result.data?.id || "",
        });
        console.log(segmentResult);
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
