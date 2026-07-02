import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { readFile } from 'fs/promises';
import { join } from 'path';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const MODULES = [
  'module1-blockchain-basics',
  'module2-crypto-markets',
  'module3-trading-strategies',
  'module4-risk-and-portfolio',
  'module5-web3-basics',
  'module6-blockchain-applications',
  'module7-wallet-key-security',
  'module8-crypto-terminology',
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  let updated = 0;
  let alreadyCurrent = 0;
  let lessonNotFound = 0;
  let moduleNotFound = 0;
  const changes = [];

  for (const moduleName of MODULES) {
    let moduleData;
    try {
      const filePath = join(process.cwd(), 'content', 'learn', `${moduleName}.json`);
      const raw = await readFile(filePath, 'utf8');
      moduleData = JSON.parse(raw);
    } catch {
      continue;
    }

    const moduleTitle = moduleData.moduleTitle || moduleData.title;
    if (!moduleTitle) continue;

    // Find ALL modules with this title (no classId filter)
    const { data: dbMods } = await db.from('learn_modules').select('id').eq('title', moduleTitle);
    if (!dbMods?.length) { moduleNotFound++; continue; }

    for (const dbMod of dbMods) {
      for (const lesson of (moduleData.lessons || [])) {
        const videoBlock = (lesson.blocks || []).find(b => b.block_type === 'video');
        if (!videoBlock) continue;

        const { data: dbLesson } = await db.from('learn_lessons')
          .select('id').eq('module_id', dbMod.id).eq('title', lesson.title).maybeSingle();
        if (!dbLesson) { lessonNotFound++; continue; }

        const { data: existingBlock } = await db.from('learn_blocks')
          .select('id, content').eq('lesson_id', dbLesson.id).eq('block_type', 'video').maybeSingle();

        if (existingBlock) {
          if (existingBlock.content?.url !== videoBlock.content?.url) {
            await db.from('learn_blocks').update({ content: videoBlock.content }).eq('id', existingBlock.id);
            changes.push(`${moduleTitle} › ${lesson.title}: ${existingBlock.content?.url?.split('v=')[1]} → ${videoBlock.content?.url?.split('v=')[1]}`);
            updated++;
          } else {
            alreadyCurrent++;
          }
        } else {
          await db.from('learn_blocks').insert({
            lesson_id: dbLesson.id,
            block_type: 'video',
            content: videoBlock.content,
            order_index: videoBlock.order_index ?? 7,
          });
          changes.push(`${moduleTitle} › ${lesson.title}: inserted ${videoBlock.content?.url?.split('v=')[1]}`);
          updated++;
        }
      }
    }
  }

  return Response.json({ success: true, updated, alreadyCurrent, lessonNotFound, moduleNotFound, changes });
}
