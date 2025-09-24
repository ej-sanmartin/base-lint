export function App() {
  const share = () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({ title: 'Hello', url: 'https://example.com' });
    } else {
      alert('Share not supported, copying link...');
    }
  };

  return <button onClick={share}>Share</button>;
}
