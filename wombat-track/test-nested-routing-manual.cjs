const puppeteer = require('puppeteer');

async function testNestedRouting() {
  console.log('🚀 Testing nested dashboard routing...');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log(`[Browser] ${msg.text()}`);
  });
  
  try {
    // Test root page
    console.log('📍 Testing root page...');
    await page.goto('http://localhost:5177/', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test projects page
    console.log('📍 Testing projects page...');
    await page.goto('http://localhost:5177/projects', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test nested phase dashboard
    console.log('📍 Testing phase dashboard...');
    await page.goto('http://localhost:5177/projects/proj-1/phases/phase-2', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check for phase dashboard elements
    const phaseTitle = await page.$('h1');
    if (phaseTitle) {
      const titleText = await page.evaluate(el => el.textContent, phaseTitle);
      console.log('✅ Phase title found:', titleText);
    } else {
      console.log('❌ No h1 title found on phase dashboard');
    }
    
    // Test nested step dashboard
    console.log('📍 Testing step dashboard...');
    await page.goto('http://localhost:5177/projects/proj-1/phases/phase-2/steps/step-2', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const stepTitle = await page.$('h1');
    if (stepTitle) {
      const titleText = await page.evaluate(el => el.textContent, stepTitle);
      console.log('✅ Step title found:', titleText);
    } else {
      console.log('❌ No h1 title found on step dashboard');
    }
    
    // Test sub-app dashboard
    console.log('📍 Testing sub-app dashboard...');
    await page.goto('http://localhost:5177/subapps/prog-orbis-001/dashboard', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const subAppTitle = await page.$('h1');
    if (subAppTitle) {
      const titleText = await page.evaluate(el => el.textContent, subAppTitle);
      console.log('✅ Sub-app title found:', titleText);
    } else {
      console.log('❌ No h1 title found on sub-app dashboard');
    }
    
    console.log('✅ Manual test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testNestedRouting();