export const showProgressModal = async (courseId, currentProgress, token, onSuccess) => {
    const modal = document.createElement('div');
    modal.style = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;";
    modal.innerHTML = `
        <div class="auth-container" style="margin: 0; width: 90%; max-width: 500px;">
            <h2>Course Progress</h2>
            <div id="moduleList" style="margin: 1rem 0; max-height: 250px; overflow-y: auto; border: 1px solid var(--border); border-radius: 0.375rem; padding: 0.5rem;">
                <p>Loading modules...</p>
            </div>
            <form id="progressForm">
                <div class="form-group">
                    <label>Overall Progress</label>
                    <input type="range" id="m-progress" min="0" max="100" value="${currentProgress}" style="width: 100%;">
                    <div style="text-align: center; font-weight: bold; margin-top: 0.5rem;" id="progressValue">${currentProgress}%</div>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit">Save Manual Progress</button>
                    <button type="button" id="closeProgressModal" style="background: #64748b;">Close</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const rangeInput = modal.querySelector('#m-progress');
    const valueDisplay = modal.querySelector('#progressValue');
    const moduleListDiv = modal.querySelector('#moduleList');

    const refreshData = async () => {
        try {
            const [courseRes, progressRes] = await Promise.all([
                fetch(`/api/courses/${courseId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/courses/${courseId}/progress`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (courseRes.ok && progressRes.ok) {
                const course = await courseRes.json();
                const progress = await progressRes.json();
                const completedIds = progress.completedModules || [];

                rangeInput.value = progress.percentageComplete;
                valueDisplay.innerText = `${progress.percentageComplete}%`;

                if (course.modules && course.modules.length > 0) {
                    moduleListDiv.innerHTML = course.modules.sort((a, b) => a.order - b.order).map(mod => `
                        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem; border-bottom: 1px solid var(--border);">
                            <input type="checkbox" class="module-check" data-id="${mod.id}" ${completedIds.includes(mod.id) ? 'checked' : ''}>
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${mod.title}</div>
                                <div style="font-size: 0.75rem; color: #64748b;">${mod.content || ''}</div>
                            </div>
                        </div>
                    `).join('');

                    moduleListDiv.querySelectorAll('.module-check').forEach(check => {
                        check.onchange = async (e) => {
                            const moduleId = parseInt(e.target.dataset.id);
                            const res = await fetch(`/api/courses/${courseId}/progress/toggle-module`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ moduleId })
                            });
                            if (res.ok) {
                                refreshData();
                                if (onSuccess) onSuccess();
                            }
                        };
                    });
                } else {
                    moduleListDiv.innerHTML = '<p style="color: #64748b; font-size: 0.875rem;">No modules defined for this course.</p>';
                }
            }
        } catch (err) {
            moduleListDiv.innerHTML = '<p>Error loading modules.</p>';
        }
    };

    refreshData();

    rangeInput.oninput = () => {
        valueDisplay.innerText = `${rangeInput.value}%`;
    };

    modal.querySelector('#closeProgressModal').onclick = () => modal.remove();
    modal.querySelector('#progressForm').onsubmit = async (e) => {
        e.preventDefault();
        const percentageComplete = parseInt(rangeInput.value);

        const res = await fetch(`/api/courses/${courseId}/progress`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ percentageComplete })
        });

        if (res.ok) {
            modal.remove();
            if (onSuccess) onSuccess();
        } else {
            alert('Failed to update progress');
        }
    };
};
