import fs from 'fs/promises';
import path from 'path';
import nunjucks from 'nunjucks';


const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production")
        return "https://devon-ai.vercel.app/";
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === "preview")
        return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    return "http://localhost:3000";
};


/*
curl "http://localhost:3000/api/openapi/schema.yml"
*/

export async function GET(request) {
    try {
        // Determine the path to the file.
        // This assumes your file is located in the "public" folder of your Next.js project.
        const filePath = path.join(process.cwd(), 'public', 'schema.yml.j2');

        // Read the file contents.
        const template = await fs.readFile(filePath, 'utf8');

        const context = { url: getBaseUrl() };

        const data = nunjucks.renderString(template, context);

        return new Response(data, {
            status: 200,
            headers: {
                // Set appropriate content type for .yml file
                'Content-Type': 'text/yaml; charset=utf-8'
            }
        });
    } catch (error) {
        // Handle any errors, such as if the file doesn't exist
        return new Response('File not found', { status: 404 });
    }
}
