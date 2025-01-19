import { createClient } from '@supabase/supabase-js'
import { v2 } from '@google-cloud/translate'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Initialize Google Translate
if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set');
}

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

const translate = new v2.Translate({
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
  projectId: serviceAccount.project_id,
});

export async function translateText(text: string, targetLanguage: string) {
  try {
    const [translation] = await translate.translate(text, targetLanguage)
    return translation
  } catch (error) {
    console.error('Translation error:', error)
    return null
  }
}

export async function createTranslations(
  content: string,
  messageId: string | null = null,
  conversationThreadCommentId: string | null = null,
  postId: string | null = null,
  postThreadCommentId: string | null = null,
  targetLanguages: { id: string, code: string }[]
) {
  try {
    const translationData: any = {
      created_at: new Date().toISOString()
    };

    // Translate content for each target language and set the appropriate field
    for (const { id, code } of targetLanguages) {
      const translation = await translateText(content, code);
      if (!translation) continue;

      switch (code) {
        case 'zh':
          translationData.mandarin_chinese_translation = translation;
          break;
        case 'es':
          translationData.spanish_translation = translation;
          break;
        case 'en':
          translationData.english_translation = translation;
          break;
        case 'hi':
          translationData.hindi_translation = translation;
          break;
        case 'ar':
          translationData.arabic_translation = translation;
          break;
        case 'bn':
          translationData.bengali_translation = translation;
          break;
        case 'pt':
          translationData.portuguese_translation = translation;
          break;
        case 'ru':
          translationData.russian_translation = translation;
          break;
        case 'ja':
          translationData.japanese_translation = translation;
          break;
        case 'pa':
          translationData.western_punjabi_translation = translation;
          break;
        default:
          continue;
      }
    }

    // Set the appropriate ID field
    if (messageId) {
      translationData.message_id = messageId;
    } else if (conversationThreadCommentId) {
      translationData.conversation_thread_comment_id = conversationThreadCommentId;
    } else if (postId) {
      translationData.post_id = postId;
    } else if (postThreadCommentId) {
      translationData.post_thread_comment_id = postThreadCommentId;
    }

    const { data, error } = await supabase
      .from('translations')
      .insert([translationData])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error in createTranslations:', error);
    return null;
  }
}

export async function getLanguages() {
  const { data: languagesData, error: languagesError } = await supabase
    .from('top_languages')
    .select('id, code');

  if (languagesError) {
    throw languagesError;
  }

  if (!languagesData) {
    throw new Error('No language codes found');
  }

  return languagesData;
} 