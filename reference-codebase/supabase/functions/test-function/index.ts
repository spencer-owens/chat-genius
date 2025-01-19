// @deno-types="https://deno.land/x/types/index.d.ts"

Deno.serve(async (req: Request) => {
  return new Response(
    JSON.stringify({
      message: "Hello from test-function!"
    }),
    { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    }
  );
});
