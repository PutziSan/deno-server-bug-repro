Deno.serve(async (req) => new Response(await req.text()));
