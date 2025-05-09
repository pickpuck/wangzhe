var list = document.querySelector('.output ul');
var totalBox = document.querySelector('.output p');
var total = 0;
list.innerHTML = '';
totalBox.textContent = '';
// number 1
                'Underpants:6.99'
                'Socks:5.99'
                'T-shirt:14.99'
                'Trousers:31.99'
                'Shoes:23.99';
// let product=[["Underpants","Socks","T-shirt","Trousers","Shoes"],[6.99,5.99,14.99,31.99,23.99]];
let product=['Underpants:6.99','Socks:5.99', 'T-shirt:14.99','Trousers:31.99','Shoes:23.99'];
for (var i = 0; i < product.length; i++) { // number 2
  // number 3

  // number 4

  // number 5
  itemText = 0;

  var listItem = document.createElement('li');
  listItem.textContent = itemText;
  list.appendChild(listItem);
}

totalBox.textContent = 'Total: $' + total.toFixed(2);
