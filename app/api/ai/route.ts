export async function POST(req: Request) {
    try {
      const { message } = await req.json();
  
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant helping immigrants settle in the US.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      });
  
      const data = await response.json();
  
      return Response.json({
        reply: data.choices?.[0]?.message?.content || "No response",
      });
  
    } catch (error) {
      console.error(error);
  
      return Response.json({
        reply: "AI error",
      });
    }
  }