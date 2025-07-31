/**
 * 🔥 Favorites.js — Client-Side Logic for Favorites Page
 *
 * Handles:
 * - Session validation and redirect if not logged in
 * - Loading and rendering the user's favorite Pokémon from backend
 * - Sorting (by ID or name)
 * - Removing Pokémon from favorites
 * - Downloading favorites as CSV
 * - Navigation protection on back/forward
 * - Sign out functionality
 */



// ✅ Sign Out Handler — Logs user out and redirects to homepage
document.getElementById("signOutBtn")?.addEventListener("click", async () => {
    try {
        const res = await fetch("/api/logout", { method: "POST" }); // Call logout API
        if (res.ok) window.location.replace("/"); // Redirect if successful
        else alert("Logout failed"); // Show error if not successful
    } catch (err) {
        console.error("Logout error:", err);
        alert("Logout error. Try again.");
    }
});

// 🔁 Handle back/forward browser navigation (re-check session)
window.addEventListener("pageshow", async (event) => {
    if (event.persisted || performance.getEntriesByType("navigation")[0].type === "back_forward") {
        const session = await checkSession(); // Revalidate session
        if (!session) return; // If session invalid, redirect happens in checkSession
    }
});

// ✅ Main logic runs after page loads
document.addEventListener("DOMContentLoaded", async () => {
    const session = await checkSession(); // 🔐 Check user session
    if (!session) return; // Redirect handled inside checkSession

    const userId = session.userId; // Extract userId from session
    const container = document.getElementById("favoritesList"); // Container for Pokémon cards
    const sortDropdown = document.getElementById("sortSelect"); // Sorting dropdown
    const downloadBtn = document.getElementById("downloadBtn"); // CSV download button

    let Favorites = []; // Store user's favorite Pokémon list

    // 📥 Load user's favorite Pokémon from backend
    async function loadFavorites() {
        try {
            const res = await fetch(`/users/${userId}/favorites?enrich=false`); // Call favorites API
            if (!res.ok) throw new Error("Could not load Favorites");
            Favorites = await res.json(); // Save result to memory
            renderFavorites(); // Render on screen
        } catch (err) {
            console.error("❌ Error loading favorites:", err);
            container.innerHTML = "<p class='text-warning'>⚠️ Failed to load Favorites.</p>";
        }
    }

    // 🧱 Render Pokémon cards on page
    function renderFavorites() {
        container.innerHTML = ""; // Clear container

        if (Favorites.length === 0) {
            container.innerHTML = "<p>No favorite Pokémon yet!</p>"; // Message for empty list
            return;
        }

        const sortBy = sortDropdown.value; // Get selected sort option
        Favorites.sort((a, b) =>
            sortBy === "name"
                ? a.name.localeCompare(b.name) // Sort alphabetically
                : a.id - b.id // Sort by ID
        );

        // Create a card for each Pokémon
        Favorites.forEach(pokemon => {
            const card = document.createElement("div");
            card.className = "pokemon-card"; // Set card class

            // 🖼️ Card HTML content
            card.innerHTML = `
                <div class="pokemon-info">
                    <img src="${pokemon.image}" alt="${pokemon.name}">
                    <h2>${pokemon.name}</h2>
                    <p><strong>ID:</strong> ${pokemon.id}</p>
                    <p><strong>Type(s):</strong> ${pokemon.types.join(", ")}</p>
                    <p><strong>Abilities:</strong> ${pokemon.abilities.join(", ")}</p>
                </div>
                <button class="remove-btn" data-id="${pokemon.id}">❤️ Remove</button>
            `;

            // 🖱️ Add redirect to Pokémon details page on card click
            card.querySelector(".pokemon-info").addEventListener("click", () => {
                window.location.href = `/pokemon/${pokemon.id}`;
            });

            container.appendChild(card); // Add card to container
        });
    }

    // ❌ Handle removal of a Pokémon from favorites
    container.addEventListener("click", async (e) => {
        if (e.target.classList.contains("remove-btn")) {
            const pokemonId = e.target.dataset.id; // Get clicked Pokémon ID
            try {
                const res = await fetch(`/users/${userId}/favorites/${pokemonId}`, {
                    method: "DELETE"
                });
                if (!res.ok) throw new Error();
                Favorites = Favorites.filter(p => p.id != pokemonId); // Remove from memory
                renderFavorites(); // Re-render updated list
            } catch {
                alert("Failed to remove favorite.");
            }
        }
    });

    // 🔁 Re-render list when sorting option changes
    sortDropdown.addEventListener("change", renderFavorites);

    // ⬇️ Download favorites as CSV
    downloadBtn.addEventListener("click", () => {
        window.location.href = `/users/${userId}/favorites/download`;
    });

    // 🔐 Utility function: check if session is valid
    async function checkSession() {
        try {
            const res = await fetch("/api/session"); // Ask server if session exists
            if (!res.ok) throw new Error();
            return await res.json(); // Return session info (userId, name)
        } catch (err) {
            window.location.replace("/"); // Redirect to intro if no session
            return null;
        }
    }

    // 🚀 Initial load of favorites when page opens
    loadFavorites();
});
