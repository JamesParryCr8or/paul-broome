import { mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const outputDirectory = join(process.cwd(), 'public', 'videos');
const videos = [
  ['proof-01.mp4', 'https://assets.cdn.filesafe.space/2x8A5up52ublohNgZGKU/media/69d3c056bec7abdef10e8896.mp4'],
  ['proof-02.mp4', 'https://assets.cdn.filesafe.space/2x8A5up52ublohNgZGKU/media/69d3bc14f1bea6bbd35346b3.mp4'],
  ['proof-03.mp4', 'https://assets.cdn.filesafe.space/2x8A5up52ublohNgZGKU/media/69d3c16d4e9962f567b243a5.mp4'],
];

const exists = (file) => stat(file).then(() => true).catch(() => false);
const transcode = (name, source) => new Promise((resolve, reject) => {
  const output = join(outputDirectory, name);
  const child = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-i', source, '-vf', 'scale=-2:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'faster', '-crf', '23', '-maxrate', '4M', '-bufsize', '8M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', output], { stdio: 'inherit' });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Conversion failed for ${name} (${code}).`)));
});

await mkdir(outputDirectory, { recursive: true });
for (const [name, source] of videos) {
  const output = join(outputDirectory, name);
  if (await exists(output)) continue;
  console.log(`Transcoding ${name} for browser delivery...`);
  await transcode(name, source);
}
