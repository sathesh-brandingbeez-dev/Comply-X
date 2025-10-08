declare module 'mammoth/mammoth.browser' {
  interface ConvertToHtmlOptions {
    arrayBuffer: ArrayBuffer
  }

  interface MammothMessage {
    type: string
    message: string
  }

  interface ConvertToHtmlResult {
    value: string
    messages: MammothMessage[]
  }

  export function convertToHtml(options: ConvertToHtmlOptions): Promise<ConvertToHtmlResult>

  const mammoth: {
    convertToHtml: typeof convertToHtml
  }

  export default mammoth
}
