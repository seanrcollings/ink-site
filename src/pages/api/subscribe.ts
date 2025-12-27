import type { APIRoute } from "astro";
import { Resend } from "resend";

export const prerender = false;

const resend = new Resend(import.meta.env.RESEND_API_KEY);
const segmentId = import.meta.env.RESEND_SEGMENT_ID;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    let body;
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

    // Validate environment variables
    if (!import.meta.env.RESEND_API_KEY || !segmentId) {
      console.error("Missing Resend configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
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
        resend.contacts.segments.add({
          segmentId: segmentId,
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
