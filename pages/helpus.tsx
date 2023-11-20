import Head from 'next/head';
import Image from 'next/image';
import MainView from 'components/landing/MainView';
import payqr from 'public/stripe-qr.png';

export default function Helpus() {
  return (
    <MainView showFooter={true}>
      <Head><title>Help mdSilo survive</title></Head>
      <div className="container p-6">
        <h1 className="text-5xl font-semibold text-center">We Appreciate Your Support</h1>
        <p className="text-xl text-center mt-4">
          recommend it to your friends, <a href="https://github.com/mdSilo/mdSilo">report bugs, contribute in coding</a> or donate...
        </p>
        <div className="container p-6 flex flex-col items-center justify-center">
          <a href="https://donate.stripe.com/6oE9ChgVZeOT4WA000" className="link mb-2 text-3xl font-bold" target="_blank" rel="noopener noreferrer">Click to donate</a>
          <Image
            src={payqr}
            width={330}
            height={395.625} 
          />
          <p className="text-xs">Powered by Stripe</p>
        </div>
      </div>
    </MainView>
  );
}
