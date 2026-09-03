import { chromium } from 'playwright';
import path from 'path';
import fileDir from 'path';

async function generatePDF() {
  console.log('Launching headless browser to export PPT Presentation PDF...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5000/presentation.html', { waitUntil: 'networkidle' });
  
  const pdfPath = path.join(process.cwd(), 'release', 'Aura_Textiles_POS_Presentation.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'Letter',
    landscape: true,
    printBackground: true,
    margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
  });

  console.log(`Presentation PDF saved successfully to: ${pdfPath}`);
  await browser.close();
}

generatePDF().catch(err => {
  console.error('PDF export failed:', err);
  process.exit(1);
});
