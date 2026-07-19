import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { money, fmtDate } from '@/lib/format'
import { PAYMENT_METHOD_LABEL } from '@/lib/constants'
import type { PaymentMethod } from '@/types/db'

export interface ReceiptData {
  businessName: string
  receiptNumber: string
  participantName: string
  sanName: string
  amount: number
  date: string
  method: PaymentMethod
  qrImage?: string
  whatsapp?: string | null
}

const NAVY = '#0e1e45'
const BLUE = '#1e63f0'
const GOLD = '#fbb614'
const GRAY = '#64748b'

const s = StyleSheet.create({
  page: { padding: 32, fontSize: 11, color: '#1e293b', fontFamily: 'Helvetica' },
  card: { border: `1 solid #e2e8f0`, borderRadius: 12, overflow: 'hidden' },
  header: { backgroundColor: NAVY, padding: 20, flexDirection: 'row', justifyContent: 'space-between' },
  brand: { color: '#ffffff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  brandRd: { color: '#8eb6ff' },
  tagline: { color: '#8eb6ff', fontSize: 9, marginTop: 2 },
  recLabel: { color: '#c7d7ff', fontSize: 9, textAlign: 'right' },
  recNum: { color: GOLD, fontSize: 16, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  body: { padding: 20 },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottom: '1 solid #f1f5f9' },
  label: { color: GRAY },
  value: { fontFamily: 'Helvetica-Bold', color: '#1e293b' },
  amountBox: { marginTop: 16, backgroundColor: '#eef4ff', borderRadius: 10, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amountLabel: { color: BLUE, fontSize: 11 },
  amount: { color: BLUE, fontSize: 22, fontFamily: 'Helvetica-Bold' },
  footer: { marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  qr: { width: 84, height: 84 },
  sign: { borderTop: `1 solid ${GRAY}`, width: 160, marginTop: 30, paddingTop: 4, fontSize: 9, color: GRAY, textAlign: 'center' },
  thanks: { marginTop: 20, textAlign: 'center', color: GRAY, fontSize: 10 },
})

export function ReceiptPDF({ data }: { data: ReceiptData }) {
  return (
    <Document title={`Recibo ${data.receiptNumber}`}>
      <Page size="A5" style={s.page}>
        <View style={s.card}>
          <View style={s.header}>
            <View>
              <Text style={s.brand}>
                Misan<Text style={s.brandRd}>RD</Text>
              </Text>
              <Text style={s.tagline}>{data.businessName}</Text>
            </View>
            <View>
              <Text style={s.recLabel}>RECIBO</Text>
              <Text style={s.recNum}>{data.receiptNumber}</Text>
            </View>
          </View>

          <View style={s.body}>
            <Text style={s.title}>Comprobante de pago</Text>
            <View style={s.row}>
              <Text style={s.label}>Participante</Text>
              <Text style={s.value}>{data.participantName}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>San</Text>
              <Text style={s.value}>{data.sanName}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Fecha</Text>
              <Text style={s.value}>{fmtDate(data.date)}</Text>
            </View>
            <View style={s.row}>
              <Text style={s.label}>Método</Text>
              <Text style={s.value}>{PAYMENT_METHOD_LABEL[data.method]}</Text>
            </View>

            <View style={s.amountBox}>
              <Text style={s.amountLabel}>Monto pagado</Text>
              <Text style={s.amount}>{money(data.amount)}</Text>
            </View>

            <View style={s.footer}>
              {data.qrImage ? <Image src={data.qrImage} style={s.qr} /> : <View />}
              <Text style={s.sign}>Firma</Text>
            </View>

            <Text style={s.thanks}>¡Gracias por tu pago! · MisanRD — Tus sans, más fácil</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
