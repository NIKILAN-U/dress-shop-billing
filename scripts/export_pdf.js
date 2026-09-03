import { chromium } from 'playwright';
import path from 'path';

async function generatePDF() {
  console.log('Launching headless browser to export PPT Presentation PDF...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const htmlPath = path.join(process.cwd(), 'frontend', 'public', 'presentation.html');
  const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
  
  console.log(`Loading presentation template from: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  
  const pdfPath = path.join(process.cwd(), 'release', 'Aura_Textiles_POS_Presentation.pdf');
  await page.pdf({
    path: pdfPath,
    width: '11in',
    height: '8.5in',
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    preferCSSPageSize: true
  });

  console.log(`Presentation PDF saved successfully to: ${pdfPath}`);
  await browser.close();
}

generatePDF().catch(err => {
  console.error('PDF export failed:', err);
  process.exit(1);
});
