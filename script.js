// PDF.js configuration
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// State management
let currentLanguage = '';
let currentPage = 1;
let totalPages = 0;
let pdfDoc = null;
let pageRendering = false;
let pageNumPending = null;

// PDF paths for each language
const pdfPaths = {
    english: 'Jio Khulke 365 an patient education initiative by Integral Therapeutic .pdf',
    hindi: 'Jio khulke 365 by Integral Therapeutic Hindi Version.pdf',
    marathi: 'Jio Khulke 365 by Integral Therapeutic Marathi version.pdf'
};

// Language display names
const languageNames = {
    english: 'English — Journey Book',
    hindi: 'Hindi — Journey Book',
    marathi: 'Marathi — Journey Book'
};

/**
 * Open the book viewer with selected language
 */
async function openBook(language) {
    currentLanguage = language;
    const modal = document.getElementById('bookModal');
    const bookTitle = document.getElementById('bookTitle');
    
    // Update modal title
    bookTitle.textContent = languageNames[language];
    
    // Show modal with animation
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Get raw filename without encoding
    let pdfFile = '';
    if (language === 'english') {
        pdfFile = 'Jio Khulke 365 an patient education initiative by Integral Therapeutic .pdf';
    } else if (language === 'hindi') {
        pdfFile = 'Jio khulke 365 by Integral Therapeutic Hindi Version.pdf';
    } else if (language === 'marathi') {
        pdfFile = 'Jio Khulke 365 by Integral Therapeutic Marathi version.pdf';
    }
    
    // Load the PDF
    await loadPDF(pdfFile);
}

/**
 * Close the book viewer
 */
function closeBook() {
    const modal = document.getElementById('bookModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset state
    currentPage = 1;
    totalPages = 0;
    pdfDoc = null;
    
    // Clear the flipbook container
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '';
}

/**
 * Load PDF document
 */
async function loadPDF(pdfPath) {
    const flipbook = document.getElementById('flipbook');
    flipbook.innerHTML = '<div class="loading"></div>';
    
    try {
        // Check if PDF.js is loaded
        if (typeof pdfjsLib === 'undefined') {
            console.error('PDF.js library not loaded!');
            throw new Error('PDF.js library not loaded. Please check internet connection.');
        }
        
        console.log('Loading PDF from:', pdfPath);
        
        // Try loading with different URL formats
        const loadingTask = pdfjsLib.getDocument({
            url: pdfPath,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
        });
        
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        
        console.log(`✅ PDF loaded successfully: ${totalPages} pages`);
        
        // Render first page
        currentPage = 1;
        await renderPage(currentPage);
        
        // Update controls
        updateControls();
        
    } catch (error) {
        console.error('❌ Error loading PDF:', error);
        flipbook.innerHTML = `
            <div style="color: #e74c3c; padding: 40px; text-align: center; background: white; border-radius: 8px; max-width: 600px; margin: 20px auto;">
                <h3 style="margin-bottom: 15px; font-size: 20px;">Cannot Load PDF</h3>
                <p style="margin-bottom: 20px; font-size: 14px; color: #666;">
                    The PDF file cannot be opened due to browser security restrictions when opening HTML files directly from disk.
                </p>
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="font-size: 13px; color: #856404; text-align: left; margin: 0;">
                        <strong>Quick Solution:</strong><br>
                        1. Open Command Prompt in this folder<br>
                        2. Run: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">python -m http.server 8000</code><br>
                        3. Open browser: <code style="background: #fff; padding: 2px 6px; border-radius: 3px;">http://localhost:8000</code>
                    </p>
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                    Or deploy to Netlify for full functionality
                </p>
            </div>
        `;
    }
}

/**
 * Render a specific page
 */
async function renderPage(pageNumber) {
    pageRendering = true;
    
    try {
        const page = await pdfDoc.getPage(pageNumber);
        
        // Calculate scale for responsive display
        const scale = window.innerWidth < 768 ? 1.0 : 1.8;
        const viewport = page.getViewport({ scale: scale });
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render PDF page into canvas context
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Create page container
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.appendChild(canvas);
        
        // Clear and add to flipbook
        const flipbook = document.getElementById('flipbook');
        flipbook.innerHTML = '';
        flipbook.appendChild(pageDiv);
        
        pageRendering = false;
        
        // If there's a pending page render, execute it
        if (pageNumPending !== null) {
            renderPage(pageNumPending);
            pageNumPending = null;
        }
        
    } catch (error) {
        console.error('Error rendering page:', error);
        pageRendering = false;
    }
}

/**
 * Queue page render if another render is in progress
 */
function queueRenderPage(pageNumber) {
    if (pageRendering) {
        pageNumPending = pageNumber;
    } else {
        renderPage(pageNumber);
    }
}

/**
 * Navigate to previous page with animation
 */
function previousPage() {
    if (currentPage <= 1) {
        return;
    }
    
    // Add flipping animation class
    const flipbook = document.getElementById('flipbook');
    const currentPageEl = flipbook.querySelector('.page');
    if (currentPageEl) {
        currentPageEl.classList.add('flipping-prev');
    }
    
    // Wait for animation, then render new page
    setTimeout(() => {
        currentPage--;
        queueRenderPage(currentPage);
        updateControls();
    }, 400);
}

/**
 * Navigate to next page with animation
 */
function nextPage() {
    if (currentPage >= totalPages) {
        return;
    }
    
    // Add flipping animation class
    const flipbook = document.getElementById('flipbook');
    const currentPageEl = flipbook.querySelector('.page');
    if (currentPageEl) {
        currentPageEl.classList.add('flipping-next');
    }
    
    // Wait for animation, then render new page
    setTimeout(() => {
        currentPage++;
        queueRenderPage(currentPage);
        updateControls();
    }, 400);
}

/**
 * Update navigation controls
 */
function updateControls() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageIndicator = document.getElementById('pageIndicator');
    
    // Update button states
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // Update page indicator - shorter text on mobile
    const isMobile = window.innerWidth < 600;
    if (isMobile) {
        pageIndicator.textContent = `${currentPage}/${totalPages}`;
    } else {
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

/**
 * Keyboard navigation
 */
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('bookModal');
    if (!modal.classList.contains('active')) return;
    
    switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            previousPage();
            break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
            nextPage();
            break;
        case 'Escape':
            closeBook();
            break;
    }
});

/**
 * Touch/Swipe navigation for mobile
 */
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

document.addEventListener('touchend', (e) => {
    const modal = document.getElementById('bookModal');
    if (!modal.classList.contains('active')) return;
    
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next page
            nextPage();
        } else {
            // Swipe right - previous page
            previousPage();
        }
    }
}

/**
 * Prevent right-click and download attempts
 */
document.addEventListener('contextmenu', (e) => {
    const modal = document.getElementById('bookModal');
    if (modal.classList.contains('active')) {
        e.preventDefault();
        return false;
    }
});

// Prevent keyboard shortcuts for saving
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('bookModal');
    if (modal.classList.contains('active')) {
        // Prevent Ctrl+S, Ctrl+P
        if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
            e.preventDefault();
            return false;
        }
    }
});

/**
 * Add smooth scroll behavior
 */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

/**
 * Page visibility handling
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause any animations when tab is not visible
        console.log('Page hidden');
    } else {
        // Resume animations
        console.log('Page visible');
    }
});

// Initialize on page load
window.addEventListener('load', () => {
    console.log('Jio Khulke 365 Journey Book - Initialized');
    console.log('Available languages:', Object.keys(pdfPaths));
});

// Handle window resize for responsive updates
window.addEventListener('resize', () => {
    if (pdfDoc && totalPages > 0) {
        updateControls();
    }
});
