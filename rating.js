// ============================================
// RATING SYSTEM FOR RAONE GROUP - SUPABASE EDITION
// ============================================

// Konfigurasi Supabase Anda
const SUPABASE_URL = 'https://fgvdviqzcxghwwbhifnd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndmR2aXF6Y3hnaHd3YmhpZm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTkxMjYsImV4cCI6MjA4NTc5NTEyNn0.Gtj_v_7tk_6P1paf-F8LQiQkn-eeYUVLttCM8JmQxQU';

// Global supabase client
let supabaseClient = null;

console.log('=== RAONE RATING SYSTEM LOADING ===');
console.log('Supabase URL:', SUPABASE_URL.substring(0, 30) + '...');

// Tunggu sampai halaman siap
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready, starting rating system...');
    initializeSystem();
});

async function initializeSystem() {
    console.log('🔧 Initializing system...');
    
    try {
        // Coba inisialisasi Supabase
        await initializeSupabase();
        console.log('✅ System ready with Supabase');
    } catch (error) {
        console.error('❌ Supabase init failed, using localStorage:', error.message);
        initializeFallback();
    }
}

async function initializeSupabase() {
    return new Promise((resolve, reject) => {
        // Cek apakah Supabase JS sudah dimuat
        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase JS not loaded, loading now...');
            
            // Load Supabase JS dinamis jika belum ada
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = () => {
                console.log('✅ Supabase JS loaded dynamically');
                createSupabaseClient();
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load Supabase JS');
                reject(new Error('Cannot load Supabase JS'));
            };
            document.head.appendChild(script);
        } else {
            console.log('✅ Supabase JS already loaded');
            createSupabaseClient();
            resolve();
        }
    });
}

function createSupabaseClient() {
    try {
        // Gunakan supabase dari global scope (setelah library dimuat)
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client created');
        
        // Setup UI
        setupUI();
        
        // Test connection
        testSupabaseConnection();
    } catch (error) {
        console.error('❌ Failed to create Supabase client:', error);
        throw error;
    }
}

async function testSupabaseConnection() {
    try {
        console.log('🔍 Testing Supabase connection...');
        
        // Test query sederhana
        const { data, error } = await supabaseClient
            .from('ratings')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.warn('⚠️ Supabase test query failed (table might not exist):', error.message);
            // Tapi lanjut saja, mungkin tabel belum dibuat
        } else {
            console.log(`✅ Supabase connected. Table exists.`);
        }
        
        // Load ratings
        await loadRatings();
        
    } catch (error) {
        console.error('❌ Supabase test failed:', error);
        // Fallback ke localStorage
        initializeFallback();
    }
}

function setupUI() {
    console.log('🎨 Setting up UI...');
    
    // DOM Elements
    const ratingForm = document.getElementById('ratingForm');
    const ratingsList = document.getElementById('ratingsList');
    const averageRating = document.getElementById('averageRating');
    const totalRatings = document.getElementById('totalRatings');
    const averageStars = document.getElementById('averageStars');
    const ratingBars = [1, 2, 3, 4, 5].map(i => document.getElementById(`bar${i}`));
    const ratingCounts = [1, 2, 3, 4, 5].map(i => document.getElementById(`count${i}`));
    
    // Validasi elements
    if (!ratingForm || !ratingsList) {
        console.error('❌ Required DOM elements not found!');
        return;
    }
    
    console.log('✅ DOM elements found');
    
    // Fungsi untuk render bintang
    function renderStars(rating) {
        if (rating < 1 || rating > 5) return '☆☆☆☆☆';
        return '★'.repeat(rating) + '☆'.repeat(5 - rating);
    }
    
    // Setup form handler
    ratingForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📤 Form submitted');
        
        const name = document.getElementById('userName').value.trim();
        const ratingInput = document.querySelector('input[name="rating"]:checked');
        const rating = ratingInput ? parseInt(ratingInput.value) : null;
        const comment = document.getElementById('comment').value.trim();
        
        // Validasi
        if (!name || name.length < 2) {
            alert('Mohon isi nama Anda (minimal 2 karakter)');
            return;
        }
        
        if (!rating) {
            alert('Mohon berikan rating dengan memilih bintang');
            return;
        }
        
        const submitBtn = document.getElementById('submitRating');
        const originalText = submitBtn.textContent;
        
        // Disable button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Mengirim...';
        
        // Try to submit to Supabase
        let supabaseSuccess = false;
        
        if (supabaseClient) {
            supabaseSuccess = await submitToSupabase(name, rating, comment);
        }
        
        if (supabaseSuccess) {
            // Success di Supabase
            alert('✅ Terima kasih! Rating Anda telah disimpan di server.');
            ratingForm.reset();
            
            // Refresh data dari Supabase
            setTimeout(async () => {
                await loadRatings();
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }, 1000);
            
        } else {
            // Fallback ke localStorage
            console.log('Falling back to localStorage...');
            saveToLocalStorage(name, rating, comment);
            
            alert('✅ Rating Anda telah disimpan secara lokal.');
            ratingForm.reset();
            
            // Refresh dari localStorage
            loadFromLocalStorage();
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
    
    // Star click handler
    document.querySelectorAll('.star-rating-input label').forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('for').replace('star', '');
            document.getElementById(`star${rating}`).checked = true;
            console.log('⭐ Selected rating:', rating);
        });
    });
    
    // Store references untuk digunakan nanti
    window.ratingSystem = {
        renderStars,
        ratingForm,
        ratingsList,
        averageRating,
        totalRatings,
        averageStars,
        ratingBars,
        ratingCounts,
        loadRatings,
        loadFromLocalStorage
    };
}

async function submitToSupabase(name, rating, comment) {
    console.log('🚀 Submitting to Supabase...');
    
    try {
        // Data untuk dikirim
        const ratingData = {
            name: name,
            rating: rating,
            comment: comment || null,
            is_approved: true,
            created_at: new Date().toISOString()
        };
        
        console.log('Data to insert:', ratingData);
        
        // Insert ke Supabase
        const { data, error } = await supabaseClient
            .from('ratings')
            .insert([ratingData])
            .select();
        
        if (error) {
            console.error('❌ Supabase insert error:', error);
            
            // Cek jika tabel belum ada
            if (error.message.includes('does not exist')) {
                console.log('Table does not exist. Please create it in Supabase.');
                alert('⚠️ Tabel ratings belum dibuat di Supabase. Rating disimpan lokal.');
            }
            
            return false;
        }
        
        console.log('✅ Successfully inserted:', data);
        return true;
        
    } catch (error) {
        console.error('❌ Error submitting to Supabase:', error);
        return false;
    }
}

async function loadRatings() {
    console.log('📥 Loading ratings...');
    
    const ratingsList = document.getElementById('ratingsList');
    
    try {
        if (!supabaseClient) {
            throw new Error('Supabase client not available');
        }
        
        // Ambil dari Supabase
        const { data: ratings, error } = await supabaseClient
            .from('ratings')
            .select('*')
            .eq('is_approved', true)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) {
            console.error('❌ Error loading from Supabase:', error);
            throw error;
        }
        
        console.log(`✅ Loaded ${ratings?.length || 0} ratings from Supabase`);
        
        if (ratings && ratings.length > 0) {
            updateUI(ratings);
            return;
        }
        
        // Jika tidak ada data di Supabase
        console.log('No ratings in Supabase, checking localStorage...');
        loadFromLocalStorage();
        
    } catch (error) {
        console.error('Failed to load from Supabase:', error);
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    console.log('📂 Loading from localStorage...');
    
    const ratings = getLocalRatings();
    updateUI(ratings);
}

function getLocalRatings() {
    const saved = localStorage.getItem('raone_ratings');
    
    if (!saved) {
        // Create sample data
        const sampleRatings = [
            {
                name: "Pelanggan Raone",
                rating: 5,
                comment: "Pelayanan sangat memuaskan!",
                created_at: new Date(Date.now() - 86400000).toISOString(),
                is_approved: true
            },
            {
                name: "Customer Bahagia", 
                rating: 4,
                comment: "Produk berkualitas dengan harga terjangkau",
                created_at: new Date(Date.now() - 172800000).toISOString(),
                is_approved: true
            }
        ];
        
        localStorage.setItem('raone_ratings', JSON.stringify(sampleRatings));
        return sampleRatings;
    }
    
    return JSON.parse(saved);
}

function saveToLocalStorage(name, rating, comment) {
    const ratings = getLocalRatings();
    
    ratings.unshift({
        name: name,
        rating: rating,
        comment: comment || null,
        created_at: new Date().toISOString(),
        is_approved: true
    });
    
    // Keep only last 50 ratings
    const trimmedRatings = ratings.slice(0, 50);
    localStorage.setItem('raone_ratings', JSON.stringify(trimmedRatings));
    
    console.log('💾 Saved to localStorage');
}

function updateUI(ratings) {
    console.log(`🎯 Updating UI with ${ratings.length} ratings`);
    
    const ratingsList = document.getElementById('ratingsList');
    const averageRating = document.getElementById('averageRating');
    const totalRatings = document.getElementById('totalRatings');
    const averageStars = document.getElementById('averageStars');
    const ratingBars = [1, 2, 3, 4, 5].map(i => document.getElementById(`bar${i}`));
    const ratingCounts = [1, 2, 3, 4, 5].map(i => document.getElementById(`count${i}`));
    
    const total = ratings.length;
    
    if (total === 0) {
        averageRating.textContent = '0.0';
        totalRatings.textContent = '0';
        averageStars.innerHTML = '☆☆☆☆☆';
        ratingsList.innerHTML = '<div class="loading">Belum ada rating. Jadilah yang pertama!</div>';
        return;
    }
    
    // Hitung rata-rata
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    const average = (sum / total).toFixed(1);
    
    // Update statistik
    averageRating.textContent = average;
    totalRatings.textContent = total;
    averageStars.innerHTML = renderStars(Math.round(parseFloat(average)));
    
    // Hitung distribusi
    const distribution = {1:0, 2:0, 3:0, 4:0, 5:0};
    ratings.forEach(r => distribution[r.rating]++);
    
    // Update bars
    [1,2,3,4,5].forEach(i => {
        const percentage = total > 0 ? (distribution[i] / total * 100) : 0;
        if (ratingBars[i-1]) {
            ratingBars[i-1].style.width = `${percentage}%`;
            ratingBars[i-1].style.transition = 'width 0.5s ease';
        }
        if (ratingCounts[i-1]) {
            ratingCounts[i-1].textContent = distribution[i];
        }
    });
    
    // Tampilkan rating terbaru
    const recent = ratings.slice(0, 5);
    ratingsList.innerHTML = recent.map(r => `
        <div class="rating-item">
            <div class="rating-header">
                <div class="rating-name">${r.name}</div>
                <div class="rating-stars">${renderStars(r.rating)}</div>
            </div>
            ${r.comment ? `<div class="rating-comment">"${r.comment}"</div>` : ''}
            <div class="rating-date">${formatDate(r.created_at)}</div>
        </div>
    `).join('');
}

function renderStars(rating) {
    if (rating < 1 || rating > 5) return '☆☆☆☆☆';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Hari ini';
        if (diffDays === 1) return 'Kemarin';
        if (diffDays < 7) return `${diffDays} hari yang lalu`;
        
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return 'Baru saja';
    }
}

function initializeFallback() {
    console.log('🔄 Switching to localStorage fallback system');
    
    // Setup form untuk localStorage-only
    const ratingForm = document.getElementById('ratingForm');
    
    if (ratingForm) {
        // Remove existing listener jika ada
        const newForm = ratingForm.cloneNode(true);
        ratingForm.parentNode.replaceChild(newForm, ratingForm);
        
        // Add new listener untuk localStorage
        newForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = document.getElementById('userName').value.trim();
            const ratingInput = document.querySelector('input[name="rating"]:checked');
            const rating = ratingInput ? parseInt(ratingInput.value) : null;
            const comment = document.getElementById('comment').value.trim();
            
            // Validasi
            if (!name || name.length < 2) {
                alert('Mohon isi nama Anda (minimal 2 karakter)');
                return;
            }
            
            if (!rating) {
                alert('Mohon berikan rating dengan memilih bintang');
                return;
            }
            
            saveToLocalStorage(name, rating, comment);
            
            // Reset form
            newForm.reset();
            
            // Show success
            alert('✅ Terima kasih! Rating Anda telah disimpan.');
            
            // Refresh display
            loadFromLocalStorage();
        });
    }
    
    // Load initial data
    loadFromLocalStorage();
    
    console.log('✅ Fallback system ready');
}

console.log('=== RATING SYSTEM CODE LOADED ===');