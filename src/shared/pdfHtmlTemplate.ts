import * as moment from 'moment';

function generateRows (data) {
 let generated_html='<tr></tr>'
 for (let i=0 ; i<data.length;i++)
  generated_html += `<tr style="text-align:left ;">
          <td class="case">${data[i].description}</td>
          <td class="case">${data[i].amout}</td>
          <td class="case">1</td>
          <td class="case">${
            data[i]?.company_data?.no_tva == true
              ? data[i].amout
              : data[i].montantHT
          }</td>
        </tr>`;

 return generated_html
}

function hidden (status,footer?){
  if (footer == true)
    status = !status
  if (status == true)
    return "hidden"
  else
    return ""
}

function isTTC(status) {
  if (status == true)
    return "TOTAL TTC"
  else
    return "MONTANT HT"
}

function totalTTC (data,status?) {
  let sum = 0;
  for (let i=0 ; i<data.length ; i++)
      sum+=Number(data[i].amout)
  return sum
}

Number.prototype.toFixed = function (precision = 1) {
  const factor = Math.pow(10, precision);
  return String(Math.floor(this * factor) / factor);
};

export function returnHTML(date, pro_data, data,total,i) {
  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    html {
      -webkit-print-color-adjust: exact;
    }

    * {
      margin: 0;
      padding: 0;
    }

    .table thead {
      display: table-header-group;
    }

    .tables-container {


      display: flex;
      padding: 3% 5%;
    }

    .table {
      padding: 0 5%;
      margin: auto;

    }


    .footer {
      margin: auto;
      display: flex;
      flex-direction: column;
      background-color: #4B8079;
      color: #ffffff;
      margin-top: 50px;
      padding: 0px 0 25px 0;

    }

    .libelle {
      font-family: 'Gilroy-Bold';
      font-weight: 600;
      font-size: 12.5px;
      line-height: 20px;
    }

    .libCont {
      background-color: #4B8079;
      border: 2px solid #e4dede;
      padding: 15px;
      color: #ffffff;
      font-size: 13px;
      font-family: 'Gilroy-Bold';
      width: 100%;
    }

    .tableHead {
      background-color: #4B8079;
      font-family: 'Gilroy-Bold';
      border: 2px solid #e4dede;
      padding: 15px;
      text-align: left;
      color: #ffffff;
      font-size: 13px;
      width: 100px;
    }

    .horizLine {
      margin: auto;
    }



    .case {
      border: 2px solid #e4dede;
      font-family: 'Gilroy-Bold';
      padding: 15px;
      font-size: 13px;
      width: 100%;
      word-break: break-word;
    }

    .box {
      text-align: left;
      margin-left: auto;
      background-color: #e4dede;
      padding: 2%;
      align-items: center;
    }

    .details {
      background-color: #e4dede;
      font-family: 'Gilroy-Bold';
      width: 350px;

    }

    .wrapper {
      text-align: left;
      margin-right: 10px;
      padding: 2% 2% 2% 0;
    }

    .p_center {
      text-align:center; 
      vertical-align: middle;
      diplay:flex;
      margin-top:50px;
      font-family: 'Gilroy-Bold';
    }
  </style>
</head>

<body>
  <!-- first section -->
  ​
  <div class="tables-container" style=" display: flex;justify-content: center;padding:5% 5% 0 5%;">

    <div style=" width: 30%;">
      <img src="https://beyang.s3.eu-central-1.amazonaws.com/Logo.png" alt="">
    </div>

    <div style="text-align: left;  margin-left: auto;">
      <span><i>Facture ${new Date(data[0]?.createdAt).getTime()} </i></span>
      <br>
      <span><i> ${date} </i></span>
    </div>
  </div>
  <!-- second section center -->
  <div class="horizLine" style="padding:0 5%;">
    ​
    <hr>
  </div>
  <div class="tables-container">
    <div class="wrapper">

      <span class="libelle">${data[0]?.company_data?.companyName}</span><br>
      <span class="libelle">${data[0]?.company_data?.address.name}</span><br>
      <span class="libelle"> ${
        data[0]?.company_data?.companyPhoneNumber
      }</span> <br>
      <span class="libelle"> ${data[0]?.to_data?.siretNumber}</span>
  </div>

      <div class="box">

      <span class="libelle">${
        data[i].from_data
          ? data[i].from_data.firstName + ' ' + data[i].from_data.lastName
          : pro_data.nom_company
      }</span><br>
      <span class="libelle">${
        data[i].from_data ? data[i].from_data.address : pro_data.adress
      }</span><br>
      <span class="libelle"> ${
        data[i].from_data
          ? data[i].from_data.phone_number_without_iso
          : pro_data.phone
      }</span> <br>
      <span class="libelle">${
        data[i].from_data ? data[i].from_data.city : pro_data.ville
      }</span> <br>
    </div>
  </div>
  <!--  table-------- -->
  <div class="table">
    ​<div>
      <table style="width:100% ;table-layout:fixed;">

        <tr style="text-align:left ;">
          <th class="libCont" style="background-color: #4B8079;">DESCRIPTION</th>
          <th class="libCont" style="background-color: #4B8079;">PRIX UNITAIRE</th>
          <th class="libCont" style="background-color: #4B8079;">QUANTITE</th>
          <th class="libCont" style="background-color: #4B8079;">${isTTC(
            data[0]?.company_data?.no_tva,
          )}</th>
        </tr>


              ${generateRows(data)}



      </table>
    </div>
    <div style="justify-content:end;display:flex">
      <table style="display:flex;margin-top:50px;flex-direction:column">

        <tr>
          <th class="tableHead" ${hidden(
            data[0]?.company_data?.no_tva,
          )}>TOTAL HT</th>
          <td class="details" ${hidden(
            data[0]?.company_data?.no_tva,
          )}>${total}</td>
        </tr>
        <tr>
          <th class="tableHead" ${hidden(
            data[0]?.company_data?.no_tva,
          )}>TVA 20%</th>
          <td class="details" ${hidden(data[0]?.company_data?.no_tva)}>${Number(
    parseFloat(String(totalTTC(data) - total)).toFixed(2),
  )}</td>
        </tr>
        <tr>
          <th class="tableHead">TOTAL TTC</th>
          <td class="details">${totalTTC(
            data,
            data[0]?.company_data?.no_tva,
          )}</td>
        </tr>

      </table>
    </div>
    <p class="p_center"${hidden(
      data[0]?.company_data?.no_tva,
      true
    )}>TVA non applicable, article 293 B du Code général des impôts.<p>
  </div><!-- ./table-container -->
  <!-- footer -->
  <footer class="footer">
    <img style="position: relative; bottom: 20px;margin: auto;" width="50" height="50"
      src="https://beyang.s3.eu-central-1.amazonaws.com/logoFooter.svg" />
    <div>
      <p style="display:flex;justify-content:center;">${
        data[i].footerData
          ? data[i].footerData.companyName
          : data[i].company_data.companyName
      }</p><br>
      <p style="display:flex;justify-content:center;">${
        data[i].footerData
          ? data[i].footerData.address.name
          : data[i].company_data.address.name
      } / ${data[i]?.to_data?.city} / ${
    data[i].company_data.companyPhoneNumber
  } / ${
    data[i].footerData
      ? data[i].footerData.siretNumber
      : data[i]?.to_data?.siretNumber
  }</p>
    </div>
  </footer>
  <!-- ./footer -->
</body>

</html>
`;
};

export function returnHTML_old(date, pro_data, data,total) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
      .tables-container{
        width: 65%;
      }
      @media (max-width: 768px) {
.tables-container{
  width: 100%;
}
}
    </style>
</head>
<body>
  <!-- first section -->

  <div class="tables-container" style="  display: flex; ">
    
    <div style=" width: 30%;  ">
  
    </div>
  
    <div style=" border: 2px solid; text-align: left;  margin-left: auto; width: 298px; margin-bottom: 20px;">
       
      Facture
      <span> ${date}</span>
    </div>
          </div>
    <!-- second section center -->
  

<div class="tables-container" style="  display: flex; ">
  
  <div  style="border: 2px solid; text-align: left; width: 30%; margin-right: 10px;  ">
    
    <span>${pro_data.nom_company}</span>
    <span>${pro_data.adress}</span>
    <span>${pro_data.ville}</span> <br>
    <span> ${pro_data.phone}</span> <br>
    <span> ${pro_data.siret}</span>
  </div>

        </div>
<!--  table-------- -->
<div class="tables-container" style=" ">

  <table border="2" style="border: 3px solid #000; border-collapse: collapse; margin-top:40px; width: 100%;" >
    <thead>
      <tr>
      	<th>NOM BENIFICIAIRE</th>
        <th>DESCRIPTION</th>
        <th>PRIX UNITAIRE</th>
         <th>QUANTITE</th>
         <th>MONTANT HT</th>

              </tr>
            </thead>
            <tbody>

              ${generateRows(data)}

            </tbody>
          </table>

          <table border="2" style="border: 3px solid #000; border-collapse: collapse; margin-top:40px; margin-left:auto;"  >
            <thead>
              <tr>
                <th>TOTAL HT</th>
                <th>${total}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>TVA 20%</td>
                <td>${Number(parseFloat(String((total * 20)/80)).toFixed(2))}</td>
              </tr>
              <tr>
                <td>QUANTITE</td>
                <td>${total*1.2}</td>
              </tr>
              
              <tr>
              </tr>
            </tbody>
        </table>
      </div><!-- ./table-container -->
      </body>
</html>
`;
};
