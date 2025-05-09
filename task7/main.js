const customName = document.getElementById('customname');
const randomize = document.querySelector('.randomize');
const story = document.querySelector('.story');

let storyText = "今天气温 34 摄氏度，:inserta:出去遛弯。当走到:insertb:门前时，突然就:insertc:。人们都惊呆了，李雷全程目睹但并没有慌，因为:inserta:是一个 130 公斤的胖子，天气又辣么热。";
let insertX = ["怪兽威利", "大老爹", "圣诞老人"];
let insertY = ["肯德基", "迪士尼乐园", "白宫"];
let insertZ = ["自燃了", "在人行道化成了一坨泥", "变成一条鼻涕虫爬走了"];

function randomValueFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}



function result() {
  let newStroy = storyText;
  let xItem = randomValueFromArray(insertX);
  let yItem = randomValueFromArray(insertY);
  let zItem = randomValueFromArray(insertZ);

  newStroy = storyText.replaceAll(":inserta:", xItem).replace(":insertb:", yItem).replace(":insertc:", zItem);

  if (customName.value !== '') {
    let name = customName.value;
    newStroy = storyText.replaceAll(":inserta:", name).replace(":insertb:", yItem).replace(":insertc:", zItem);

  }

  if (document.getElementById("american").checked) {
    let weight = Math.round(300);
    let temperature = Math.round(94);
    newStroy = newStroy.replace("34", temperature).replace("摄氏度", "华氏度").replace("130", weight).replace("公斤", "磅");

  }

  story.textContent = newStroy;
  story.style.visibility = 'visible';
}


window.onload = function () { randomize.addEventListener('click', result); };