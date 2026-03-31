import { navigate } from '../app.js';

export const courseViewPage = async (container, courseId) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return navigate('login');

    container.innerHTML = '<div style="padding: 2rem; text-align: center;">Loading course content...</div>';

    try {
        const [courseRes, progressRes] = await Promise.all([
            fetch(`/api/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`/api/courses/${courseId}/progress`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!courseRes.ok) throw new Error('Course not found');
        
        const course = await courseRes.json();
        const progress = progressRes.ok ? await progressRes.json() : { percentageComplete: 0, completedModules: [] };
        const completedModules = progress.completedModules || [];

        const modules = (course.modules || []).sort((a, b) => a.order - b.order);
        let activeModuleIndex = 0;

        const render = () => {
            const activeModule = modules[activeModuleIndex];
            
            container.innerHTML = `
                <div style="display: grid; grid-template-columns: 300px 1fr; height: calc(100vh - 64px); overflow: hidden;">
                    <!-- Sidebar -->
                    <div style="background: #f8fafc; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column;">
                        <div style="padding: 1.5rem; border-bottom: 1px solid #e2e8f0;">
                            <button id="backToDashboard" style="background: none; border: none; color: #6366f1; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                ← Back to Dashboard
                            </button>
                            <h2 style="font-size: 1.25rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem;">${course.title}</h2>
                            <div style="font-size: 0.875rem; color: #64748b;">
                                ${progress.percentageComplete}% Complete
                                <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 0.5rem;">
                                    <div style="width: ${progress.percentageComplete}%; height: 100%; background: #10b981; border-radius: 3px;"></div>
                                </div>
                            </div>
                        </div>
                        <div style="flex: 1; overflow-y: auto; padding: 1rem 0;">
                            ${modules.map((mod, index) => `
                                <div class="module-nav-item ${index === activeModuleIndex ? 'active' : ''}" data-index="${index}" style="padding: 1rem 1.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.75rem; transition: all 0.2s; ${index === activeModuleIndex ? 'background: #eff6ff; border-left: 4px solid #2563eb; color: #1e40af;' : 'color: #475569;'}">
                                    <div style="width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${completedModules.includes(mod.id) ? '#10b981' : '#cbd5e1'}; background: ${completedModules.includes(mod.id) ? '#10b981' : 'transparent'}; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;">
                                        ${completedModules.includes(mod.id) ? '✓' : ''}
                                    </div>
                                    <span style="font-weight: ${index === activeModuleIndex ? '600' : '500'}; font-size: 0.9375rem;">${mod.title}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Main Content -->
                    <div style="overflow-y: auto; background: white; padding: 3rem;">
                        <div style="max-width: 800px; margin: 0 auto;">
                            ${activeModule ? `
                                <div style="margin-bottom: 2rem;">
                                    <span style="font-size: 0.875rem; font-weight: 600; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em;">Module ${activeModule.order}</span>
                                    <h1 style="font-size: 2.5rem; font-weight: 800; color: #1e293b; margin-top: 0.5rem; margin-bottom: 1.5rem;">${activeModule.title}</h1>
                                    <div style="line-height: 1.8; color: #334155; font-size: 1.125rem;">
                                        ${activeModule.content.split('\n').map(p => `<p style="margin-bottom: 1.5rem;">${p}</p>`).join('')}
                                    </div>
                                </div>
                                <div style="border-top: 1px solid #e2e8f0; padding-top: 2rem; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4rem;">
                                    <button id="prevModule" style="background: #f1f5f9; color: #475569; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;" ${activeModuleIndex === 0 ? 'disabled' : ''}>Previous</button>
                                    <button id="toggleComplete" style="background: ${completedModules.includes(activeModule.id) ? '#f1f5f9' : '#10b981'}; color: ${completedModules.includes(activeModule.id) ? '#475569' : 'white'}; padding: 0.75rem 2rem; border-radius: 0.5rem; font-weight: 700;">
                                        ${completedModules.includes(activeModule.id) ? 'Completed ✓' : 'Mark as Complete'}
                                    </button>
                                    <button id="nextModule" style="background: #2563eb; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600;" ${activeModuleIndex === modules.length - 1 ? 'disabled' : ''}>Next</button>
                                </div>

                                <!-- Reviews Section -->
                                <div style="border-top: 2px solid #f1f5f9; padding-top: 3rem;">
                                    <h2 style="font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 2rem;">Course Reviews</h2>
                                    
                                    <div style="background: #f8fafc; border-radius: 1rem; padding: 2rem; margin-bottom: 3rem;">
                                        <h3 style="font-size: 1.125rem; font-weight: 700; color: #1e293b; margin-bottom: 1rem;">Leave a Review</h3>
                                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem;" id="starRating">
                                            ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}" style="font-size: 1.5rem; cursor: pointer; color: #cbd5e1;">★</span>`).join('')}
                                        </div>
                                        <textarea id="reviewComment" placeholder="Share your thoughts about this course..." style="width: 100%; padding: 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; min-height: 100px; margin-bottom: 1rem; font-family: inherit;"></textarea>
                                        <button id="submitReview" style="background: #6366f1; color: white; padding: 0.75rem 2rem; border-radius: 0.75rem; font-weight: 700; border: none; cursor: pointer;">Submit Review</button>
                                    </div>

                                    <div id="reviewsList">
                                        ${(course.reviews || []).length > 0 ? course.reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(rev => `
                                            <div style="margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #f1f5f9;">
                                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                                    <div style="font-weight: 700; color: #1e293b;">${rev.user.email}</div>
                                                    <div style="color: #f59e0b;">${'★'.repeat(rev.rating)}${'☆'.repeat(5 - rev.rating)}</div>
                                                </div>
                                                <div style="color: #475569; line-height: 1.6;">${rev.comment || 'No comment provided.'}</div>
                                                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.5rem;">${new Date(rev.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        `).join('') : '<p style="color: #94a3b8; text-align: center; padding: 2rem;">No reviews yet. Be the first to review!</p>'}
                                    </div>
                                </div>
                            ` : `
                                <div style="text-align: center; padding: 4rem;">
                                    <h2 style="color: #64748b;">No modules available for this course.</h2>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
            `;

            // Event Listeners
            container.querySelector('#backToDashboard').onclick = () => navigate('dashboard');
            
            container.querySelectorAll('.module-nav-item').forEach(item => {
                item.onclick = () => {
                    activeModuleIndex = parseInt(item.dataset.index);
                    render();
                };
            });

            if (activeModule) {
                const prevBtn = container.querySelector('#prevModule');
                if (prevBtn) prevBtn.onclick = () => {
                    if (activeModuleIndex > 0) {
                        activeModuleIndex--;
                        render();
                    }
                };

                const nextBtn = container.querySelector('#nextModule');
                if (nextBtn) nextBtn.onclick = () => {
                    if (activeModuleIndex < modules.length - 1) {
                        activeModuleIndex++;
                        render();
                    }
                };

                container.querySelector('#toggleComplete').onclick = async () => {
                    try {
                        const res = await fetch(`/api/courses/${courseId}/progress/toggle-module`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ moduleId: activeModule.id })
                        });
                        if (res.ok) {
                            const updatedProgress = await fetch(`/api/courses/${courseId}/progress`, { 
                                headers: { 'Authorization': `Bearer ${token}` } 
                            }).then(r => r.json());
                            
                            progress.percentageComplete = updatedProgress.percentageComplete;
                            progress.completedModules = updatedProgress.completedModules;
                            completedModules.length = 0;
                            completedModules.push(...updatedProgress.completedModules);
                            render();
                        }
                    } catch (err) {
                        console.error('Error toggling module completion', err);
                    }
                };

                // Review System Listeners
                let selectedRating = 0;
                const stars = container.querySelectorAll('.star');
                stars.forEach(star => {
                    star.onmouseover = () => {
                        const val = parseInt(star.dataset.value);
                        stars.forEach(s => {
                            if (parseInt(s.dataset.value) <= val) s.style.color = '#f59e0b';
                            else s.style.color = '#cbd5e1';
                        });
                    };
                    star.onmouseout = () => {
                        stars.forEach(s => {
                            if (parseInt(s.dataset.value) <= selectedRating) s.style.color = '#f59e0b';
                            else s.style.color = '#cbd5e1';
                        });
                    };
                    star.onclick = () => {
                        selectedRating = parseInt(star.dataset.value);
                        stars.forEach(s => {
                            if (parseInt(s.dataset.value) <= selectedRating) s.style.color = '#f59e0b';
                            else s.style.color = '#cbd5e1';
                        });
                    };
                });

                const submitBtn = container.querySelector('#submitReview');
                if (submitBtn) submitBtn.onclick = async () => {
                    const comment = container.querySelector('#reviewComment').value;
                    if (selectedRating === 0) {
                        alert('Please select a rating');
                        return;
                    }

                    try {
                        const response = await fetch(`/api/courses/${courseId}/reviews`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ rating: selectedRating, comment })
                        });

                        if (response.ok) {
                            alert('Review submitted successfully!');
                            render(); // Refresh page to show new review
                        } else {
                            const data = await response.json();
                            alert(data.message || 'Failed to submit review');
                        }
                    } catch (error) {
                        console.error('Error submitting review:', error);
                        alert('An error occurred while submitting your review');
                    }
                };
            }
        };

        render();

    } catch (err) {
        container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #ef4444;">${err.message}</div>`;
    }
};
