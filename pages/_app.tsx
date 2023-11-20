import Head from 'next/head';
import Router from 'next/router';
//import Script from 'next/script';
import { ToastContainer } from 'react-toastify';
import NProgress from 'nprogress';
import type { AppProps } from 'next/app';
import AppLayout from 'components/AppLayout';
import ServiceWorker from 'components/ServiceWorker';
import 'styles/styles.css';
import 'styles/nprogress.css';
import 'react-toastify/dist/ReactToastify.css';
import 'tippy.js/dist/tippy.css';
import 'styles/mindmap.css';

Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

export default function MyApp({ Component, pageProps, router }: AppProps) {
  return (
    <>
      <Head>
        <title>mdSilo</title>
      </Head>
      <ServiceWorker>
        {router.pathname.startsWith('/app') ? (
          <AppLayout>
            <Component {...pageProps} />
          </AppLayout>
        ) : (
          <Component {...pageProps} />
        )}
      </ServiceWorker>
      <ToastContainer
        position="top-center"
        hideProgressBar
        newestOnTop={true}
        theme="colored"
      />
    </>
  );
}
