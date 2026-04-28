declare module "html2pdf.js" {
  type Html2PdfWorker = {
    from: (src: HTMLElement | string) => Html2PdfWorker;
    set: (opts: Record<string, unknown>) => Html2PdfWorker;
    save: () => Promise<void>;
  };
  function html2pdf(): Html2PdfWorker;
  export default html2pdf;
}
