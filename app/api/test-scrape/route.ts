import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    console.log('Testing scrape for URL:', url);

    // Try to fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      return NextResponse.json({
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      }, { status: 500 });
    }

    const html = await response.text();
    console.log('HTML length:', html.length);
    console.log('HTML preview:', html.substring(0, 500));

    const $ = cheerio.load(html);

    // Try to find any car-related elements
    const analysis = {
      title: $('title').text(),
      h1Count: $('h1').length,
      h2Count: $('h2').length,
      h3Count: $('h3').length,
      imgCount: $('img').length,
      linkCount: $('a').length,
      divCount: $('div').length,
      classesFound: [] as string[],
      idsFound: [] as string[],
      potentialCarCards: [] as string[],
    };

    // Find common classes
    $('[class]').each((_, el) => {
      const classes = $(el).attr('class')?.split(' ') || [];
      classes.forEach(cls => {
        if (cls && !analysis.classesFound.includes(cls)) {
          analysis.classesFound.push(cls);
        }
      });
    });

    // Find common IDs
    $('[id]').each((_, el) => {
      const id = $(el).attr('id');
      if (id && !analysis.idsFound.includes(id)) {
        analysis.idsFound.push(id);
      }
    });

    // Look for potential car card selectors
    const potentialSelectors = [
      '.car-card', '.listing-card', '.vehicle-card',
      '.car-item', '.listing-item', '.vehicle-item',
      '.used-car', '.car-info', '[data-car]',
      '.gsc_col', '.usedCarTile', '[data-vehicle-id]',
    ];

    potentialSelectors.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        analysis.potentialCarCards.push(`${selector}: ${count} found`);
      }
    });

    // Limit arrays for response size
    analysis.classesFound = analysis.classesFound.slice(0, 50);
    analysis.idsFound = analysis.idsFound.slice(0, 20);

    return NextResponse.json({
      success: true,
      url,
      analysis,
      htmlPreview: html.substring(0, 1000),
    });

  } catch (error) {
    console.error('Test scrape error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
