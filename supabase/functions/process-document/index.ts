import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProcessRequest {
  documentId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { documentId }: ProcessRequest = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabase
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      await supabase
        .from('documents')
        .update({ processing_status: 'failed' })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let extractedText = '';
    const fileType = document.file_type.toLowerCase();

    if (fileType === 'pdf') {
      extractedText = `[PDF content from ${document.filename}] - Processing placeholder`;
    } else if (fileType === 'pptx' || fileType === 'ppt') {
      extractedText = `[PowerPoint content from ${document.filename}] - Processing placeholder`;
    } else if (fileType === 'xlsx' || fileType === 'xls' || fileType === 'csv') {
      extractedText = `[Spreadsheet content from ${document.filename}] - Processing placeholder`;
    } else if (fileType === 'docx' || fileType === 'doc') {
      extractedText = `[Word document content from ${document.filename}] - Processing placeholder`;
    } else {
      extractedText = 'Unknown file type';
    }

    const summary = `Document: ${document.filename}\n\nThis is an auto-generated summary placeholder. Full document processing with text extraction, summarization, and embedding generation will be implemented in the next phase.`;

    const tags = ['document', fileType];
    if (document.filename.toLowerCase().includes('analysis')) tags.push('analysis');
    if (document.filename.toLowerCase().includes('report')) tags.push('report');
    if (document.filename.toLowerCase().includes('presentation')) tags.push('presentation');

    const model = new Supabase.ai.Session('gte-small');

    const chunks = [];
    const chunkSize = 1000;
    for (let i = 0; i < extractedText.length; i += chunkSize) {
      const chunk = extractedText.substring(i, i + chunkSize);

      const embedding = await model.run(chunk, { mean_pool: true, normalize: true });

      const embeddingArray = Array.isArray(embedding) ? embedding : (embedding.data || embedding);

      chunks.push({
        document_id: documentId,
        chunk_index: Math.floor(i / chunkSize),
        content: chunk,
        embedding: '[' + embeddingArray.join(',') + ']',
        metadata: { page: Math.floor(i / chunkSize) + 1 },
      });
    }

    if (chunks.length > 0) {
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunks);

      if (chunkError) {
        console.error('Error inserting chunks:', chunkError);
      }
    }

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processing_status: 'completed',
        summary,
        tags,
      })
      .eq('id', documentId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update document' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        summary,
        tags,
        chunksCreated: chunks.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Processing error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Processing failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});