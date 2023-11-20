export default function UpdateBanner() {
  return (
    <button
      id="update-banner"
      className="hidden w-full py-1 font-semibold text-center text-blue-900 bg-blue-300"
      onClick={updateAndReloadApp}
    >
      Save your work and Click here to reload the new version of mdSilo app.
    </button>
  );
}

const updateAndReloadApp = async () => {
  // export works before reloading to avoid works lost
  // const exportOnClose = store.getState().exportOnClose;
  // if (exportOnClose) { await exportNotesJson(); }

  const wb = window.workbox;
  // Reload the app once the new service worker is controlling it
  wb.addEventListener('controlling', () => window.location.reload());
  // Send a message to the waiting service worker, instructing it to activate.
  wb.messageSkipWaiting();
};
