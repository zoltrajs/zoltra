/**
 * Generates the HTML content to be sent to the client's browser.
 *
 */
export const generateWelcomePage = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Zoltra is a lightweight, plugin-first Node.js framework for building fast and scalable web servers."
    />
    <meta
      property="og:title"
      content="Zoltra - Plugin-First Node.js Framework"
    />
    <meta
      property="og:description"
      content="A lightweight, plugin-first Node.js framework for web servers."
    />
    <meta property="og:image" content="https://raw.githubusercontent.com/zoltrajs/zoltra/main/meta/zoltrajs-logo.png" />
    <meta property="og:url" content="https://zoltra.dev" />
    <title>Zoltra - plugin-first Node.js framework for web servers</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Rubik:ital,wght@0,300..900;1,300..900&display=swap"
      rel="stylesheet"
    />
    <link rel="icon" type="image/svg+xml" href="https://raw.githubusercontent.com/zoltrajs/zoltra/main/meta/favicon.ico" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script
      src="https://kit.fontawesome.com/3e1bc8a51d.js"
      crossorigin="anonymous"
    ></script>
    <style>
      body {
        font-family: "Inter", sans-serif;
      }
      .gradient-bg {
        background: linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);
      }
      .animated-gradient {
        position: absolute;
        width: 500px;
        height: 500px;
        background: radial-gradient(
          circle,
          rgba(41, 98, 255, 0.8) 0%,
          rgba(0, 255, 157, 0.6) 30%,
          rgba(0, 255, 157, 0) 50%
        );
        filter: blur(50px);
        z-index: -1;
        animation: orbit 20s ease-in-out infinite;
        pointer-events: none;
      }
      @keyframes orbit {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 0.8;
        }
        25% {
          transform: translate(30vw, 20vh) scale(1.2);
          opacity: 0.6;
        }
        50% {
          transform: translate(60vw, -10vh) scale(0.9);
          opacity: 0.7;
        }
        75% {
          transform: translate(20vw, -20vh) scale(1.1);
          opacity: 0.5;
        }
        100% {
          transform: translate(0, 0) scale(1);
          opacity: 0.8;
        }
      }
      .card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }

      .logo img {
        transition: transform 0.3s ease;
      }
      .logo:hover img {
        transform: scale(1.1);
      }
      .gradient-text {
        background: linear-gradient(to right, #2962ff 0%, #00ff9d 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .font-rubik {
        font-family: "Rubik", sans-serif;
      }
      .social-link {
        transition: transform 0.3s ease, color 0.3s ease;
      }
      .social-link:hover {
        transform: scale(1.1);
        color: transparent;
        background: linear-gradient(to right, #2962ff 0%, #00ff9d 100%);
        -webkit-background-clip: text;
        background-clip: text;
      }
    </style>
  </head>
  <body class="gradient-bg text-white min-h-screen overflow-x-hidden pt-6">
    <div class="animated-gradient"></div>

    <main
      class="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-12"
    >
      <div class="logo flex flex-col items-center gap-4 mb-6">
        <h1
          class="text-6xl font-medium gradient-text tracking-tight font-rubik"
        >
          Zoltra
        </h1>
      </div>

      <p
        class="description max-w-2xl text-center text-2xl leading-relaxed text-gray-100 font-medium mb-12 font-rubik"
      >
        A lightweight, plugin-first Node.js framework for building fast and
        scalable web servers
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl w-full">
        <a
          href="https://zoltra.dev/docs"
          class="card bg-black border border-neutral-700 rounded-lg p-6 hover:bg-neutral-800/30"
        >
          <h2 class="text-xl font-semibold mb-2">Documentation →</h2>
          <p class="text-sm text-gray-400">
            Find in-depth information about Zoltra features and API.
          </p>
        </a>

        <a
          href="https://zoltra.dev/learn"
          class="card bg-black border border-neutral-700 rounded-lg p-6 hover:bg-neutral-800/30"
        >
          <h2 class="text-xl font-semibold mb-2">Learn →</h2>
          <p class="text-sm text-gray-400">
            Learn about Zoltra in an interactive course with quizzes!
          </p>
        </a>

        <a
          href="https://zoltra.dev/examples"
          class="card bg-black border border-neutral-700 rounded-lg p-6 hover:bg-neutral-800/30"
        >
          <h2 class="text-xl font-semibold mb-2">Examples →</h2>
          <p class="text-sm text-gray-400">
            Discover and deploy boilerplate example Zoltra projects.
          </p>
        </a>

        <a
          href="https://zoltra.dev/deploy"
          class="card bg-black border border-neutral-700 rounded-lg p-6 hover:bg-neutral-800/30"
        >
          <h2 class="text-xl font-semibold mb-2">Deploy →</h2>
          <p class="text-sm text-gray-400">
            Instantly deploy your Zoltra site to a public URL.
          </p>
        </a>
      </div>

      <div class="flex gap-6 mt-12 text-white">
        <a
          title="Visit Zoltra GitHub"
          target="_blank"
          href="https://github.com/zoltrajs"
          class="text-gray-400 social-link"
          aria-label="Zoltra GitHub"
        >
          <i class="fa-brands fa-github fa-xl"></i>
        </a>
        <a
          target="_blank"
          href="https://twitter.com/zoltrajs"
          class="text-gray-400 social-link"
          aria-label="Zoltra Twitter"
        >
          <i class="fa-brands fa-x-twitter fa-xl"></i>
        </a>
        <a
          target="_blank"
          href="https://discord.gg/zoltrajs"
          class="social-link text-gray-400"
          aria-label="Zoltra Discord"
        >
          <i class="fa-brands fa-discord fa-xl"></i>
        </a>
      </div>
    </main>
  </body>
</html>
  `;
