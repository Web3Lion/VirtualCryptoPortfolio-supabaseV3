import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Match existing content/learn/*.json files by moduleTitle so exports overwrite
// the right file instead of creating a duplicate under a new name.
function getExistingFilenameMap() {
  const contentDir = path.join(process.cwd(), 'content', 'learn');
  const map = {};
  try {
    for (const f of fs.readdirSync(contentDir)) {
      if (!f.endsWith('.json')) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8'));
        if (data.moduleTitle) map[data.moduleTitle] = f;
      } catch { /* skip unreadable file */ }
    }
  } catch { /* content dir missing — map stays empty */ }
  return map;
}

async function buildModuleJSON(mod) {
  const { data: lessons } = await db.from('learn_lessons').select('*').eq('module_id', mod.id).order('order_index');

  const fullLessons = [];
  for (const lesson of lessons || []) {
    const [{ data: blocks }, { data: questions }] = await Promise.all([
      db.from('learn_blocks').select('block_type, content, order_index').eq('lesson_id', lesson.id).order('order_index'),
      db.from('learn_questions').select('id, question_text, explanation, order_index').eq('lesson_id', lesson.id).order('order_index'),
    ]);

    const fullQuestions = [];
    for (const q of questions || []) {
      const { data: options } = await db.from('learn_options').select('option_text, is_correct, order_index').eq('question_id', q.id).order('order_index');
      fullQuestions.push({
        question_text: q.question_text,
        explanation: q.explanation,
        options: (options || []).map(o => ({ option_text: o.option_text, is_correct: o.is_correct })),
      });
    }

    fullLessons.push({
      title: lesson.title,
      description: lesson.description,
      order_index: lesson.order_index,
      tokens_reward: lesson.tokens_reward,
      pass_threshold: lesson.pass_threshold,
      blocks: (blocks || []).map(b => ({ block_type: b.block_type, content: b.content })),
      questions: fullQuestions,
    });
  }

  return {
    moduleTitle: mod.title,
    moduleEmoji: mod.emoji,
    moduleDescription: mod.description,
    order_index: mod.order_index,
    lessons: fullLessons,
  };
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase()) {
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const moduleId = searchParams.get('moduleId');
  const all = searchParams.get('all') === 'true';
  const filenameMap = getExistingFilenameMap();

  if (all) {
    const { data: modules, error } = await db.from('learn_modules').select('*').order('order_index');
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const zip = new JSZip();
    for (const mod of modules || []) {
      const json = await buildModuleJSON(mod);
      const filename = filenameMap[mod.title] || `module-${mod.order_index}-${slugify(mod.title)}.json`;
      zip.file(filename, JSON.stringify(json, null, 2));
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="learn-content-export.zip"',
      },
    });
  }

  if (!moduleId) return Response.json({ error: 'moduleId or all=true is required' }, { status: 400 });

  const { data: mod, error } = await db.from('learn_modules').select('*').eq('id', moduleId).single();
  if (error || !mod) return Response.json({ error: 'Module not found' }, { status: 404 });

  const json = await buildModuleJSON(mod);
  const filename = filenameMap[mod.title] || `module-${mod.order_index}-${slugify(mod.title)}.json`;

  return new Response(JSON.stringify(json, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
