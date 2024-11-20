import * as moment from 'moment';
import {returnHTML }from './pdfHtmlTemplate'
import { v4 as uuidv4 } from 'uuid';

Number.prototype.toFixed = function (precision = 1) {
  const factor = Math.pow(10, precision);
  return String(Math.floor(this * factor) / factor);
};

function handleData (data){
 const _ = require('lodash');
 const result = _(data)
   .groupBy((v) => moment(v.createdAt).format('DD/MM/YYYY:HH:mm:ss'))
   .mapValues((v) => v)
   .value()
 return result
}

function generateDescriptionAppointment (appointment) {
  let result = ''
  for (let i=0 ; i< appointment?.appointmentId?.prestations?.length ; i++)
    result += appointment.appointmentId?.prestations[i]?.name+" "
  return result
}

function generateBeyangData(company_data) {
  return {
    companyName: 'beYANG',
    address: { name: '55 rue de Campeyraut 33000 Bordeaux' },
    companyPhoneNumber: '-'
  };
}

const beyang_data = {
  companyName: 'beYANG',
  address: { name: '55 rue de Campeyraut 33000 Bordeaux' },
  companyPhoneNumber:"-",
};

function generateProDataExport(handled_data, key, from, comany_data, to_data) {
  let total_ht = 0;
  let data_value_array = [];
  if (from == 'sub')
    for (let i = 0; i < handled_data[key].length; i++) {
      const data_value = {
        createdAt: handled_data[key][i].createdAt,
        company_data: generateBeyangData(comany_data),
        to_data: { siretNumber: '91053928700011', city: 'Bordeaux' },
        nom: handled_data[key][i]?.from?.firstName
          ? handled_data[key][i]?.from?.firstName
          : '-',
        description: handled_data[key][i].subId.name,
        amout: parseFloat(
          String((handled_data[key][i]?.amount / 100) * 1.2),
        ).toFixed(2),
        montantHT: Number(
          parseFloat(String(handled_data[key][i]?.amount / 100)),
        ),
        footerData: {
          companyName: 'TRIVIUM CONCEPT',
          address: { name: '55 rue de Campeyraut / 33000 Bordeaux' },
          phoneNumber: '',
          siretNumber: '91053928700011',
        },
      };
      total_ht += Number(
        parseFloat(String(handled_data[key][i]?.amount / 100)).toFixed(2),
      );
      data_value_array.push(data_value);
    }

  if (from == 'packEvent')
    for (let i = 0; i < handled_data[key].length; i++) {
      const data_value = {
        createdAt: handled_data[key][i].createdAt,
        company_data: generateBeyangData(comany_data),
        to_data: { siretNumber: '91053928700011', city: 'Bordeaux' },
        nom: handled_data[key][i]?.from?.firstName
          ? handled_data[key][i]?.from?.firstName
          : '-',
        description:
          'Pack event ' + handled_data[key][i].eventPackId.number_of_events,
        amout: parseFloat(String(handled_data[key][i]?.amount / 100)),
        montantHT: Number(
          parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(
            2,
          ),
        ),
        footerData: {
          companyName: 'TRIVIUM CONCEPT',
          address: { name: '55 rue de Campeyraut / 33000 Bordeaux' },
          phoneNumber: '',
          siretNumber: '91053928700011',
        },
      };
      total_ht += Number(
        parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(2),
      );
      data_value_array.push(data_value);
    }

  if (from == 'appointment')
    for (let i = 0; i < handled_data[key].length; i++) {
      if (handled_data[key][i].status != 'Success' && handled_data[key][i].status != 'Refunded') continue;
      const data_value = {
        createdAt: handled_data[key][i].createdAt,
        from_data: handled_data[key][i]?.from,
        to_data: to_data,
        company_data: comany_data,
        nom: handled_data[key][i]?.from?.firstName
          ? handled_data[key][i]?.from?.firstName +
            ' ' +
            handled_data[key][i]?.from?.lastName
          : '-',
        description: generateDescriptionAppointment(handled_data[key][i]),
        amout: parseFloat(String(handled_data[key][i]?.amount / 100)),
        montantHT: Number(
          parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(
            2,
          ),
        ),
      };
      total_ht += Number(
        parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(2),
      );
      data_value_array.push(data_value);
    }

  if (from == 'event')
    for (let i = 0; i < handled_data[key].length; i++) {
      handled_data[key][i].amount = +handled_data[key][i].amount-100
      const data_value = {
        createdAt: handled_data[key][i].createdAt,
        from_data: handled_data[key][i]?.from,
        to_data: to_data,
        company_data: comany_data,
        nom: handled_data[key][i]?.from?.firstName
          ? handled_data[key][i]?.from?.firstName +
            ' ' +
            handled_data[key][i]?.from?.lastName
          : '-',
        description: handled_data[key][i].eventId.event_name,
        amout: parseFloat(String(handled_data[key][i]?.amount / 100)),
        montantHT: Number(
          parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(
            2,
          ),
        ),
      };
      total_ht += Number(
        parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(2),
      );
      data_value_array.push(data_value);
    }

  if (from == 'client')
    for (let i = 0; i < handled_data[key].length; i++) {
      if (handled_data[key][i].status != 'Success') continue;
      const data_value = {
        createdAt: handled_data[key][i].createdAt,
        to_data: handled_data[key][i]?.to,
        company_data: handled_data[key][i]?.to?.relatedCompany,
        nom: handled_data[key][i]?.to?.relatedCompany.companyName,
        description: handled_data[key][i]?.eventId?.event_name
          ? handled_data[key][i]?.eventId?.event_name
          : generateDescriptionAppointment(handled_data[key][i]),
        amout: parseFloat(String(handled_data[key][i]?.amount / 100)),
        montantHT: Number(
          parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(
            2,
          ),
        ),
      };
      total_ht += Number(
        parseFloat(String(handled_data[key][i]?.amount / 100 / 1.2)).toFixed(2),
      );
      data_value_array.push(data_value);
    }

  return { total_ht, data_value_array };
}
export async function generatePdf (data,comany_data,pro_data , from) {
 const handled_data = handleData(data)
 const puppeteer = require('puppeteer');
 const PDFMerger = require('pdf-merger-js');
 const browser = await puppeteer.launch({
   executablePath: '/usr/bin/chromium-browser',
   args: ['--no-sandbox']
 });
 const page = await browser.newPage();
 const merger = new PDFMerger();
 let filename = __dirname+'/tmp/'+uuidv4()+'.pdf';
 let i=0;
 for (const key in handled_data){
  let pro_data_export;
  if (from != "client")
   pro_data_export = {
    nom_company: comany_data.companyName,
    adress: comany_data.address.name,
    ville: pro_data.city,
    phone: comany_data.company_phone_number_without_iso,
    siret: pro_data.siretNumber,
  };
  else
   pro_data_export = {
     nom_company: comany_data.firstName + ' ' + comany_data.lastName,
     adress: comany_data.address,
     ville: comany_data.city,
     phone: comany_data.phone_number_without_iso,
     siret: "",
   };
  const { total_ht, data_value_array } = generateProDataExport(handled_data,key,from,comany_data,pro_data)
  if (data_value_array.length == 0)
   continue
    const rendred_html = returnHTML(
      String(key),
      pro_data_export,
      data_value_array,
      total_ht,
      i,
    );
   await page.setContent(rendred_html);
   merger.add(await page.pdf());
 }
 await page.setContent(`
    <html>
    </html>
  `);
 merger.add(await page.pdf())
 await merger.save(filename);
  await browser.close();
 return filename
}
