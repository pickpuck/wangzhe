const displayedImage = document.querySelector('.displayed-img');
const thumbBar = document.querySelector('.thumb-bar');

const btn = document.querySelector('button');
const overlay = document.querySelector('.overlay');
function change() {
    if (btn.getAttribute('class') === 'light') {
        console.log('light');
        btn.setAttribute('class', "dark");
        btn.textContent = "Darken";
        overlay.style.backgroundColor = "rgba(0,0,0,0)";
        return;

    }
    if (btn.getAttribute('class') === 'dark') {
        console.log("dark");
        btn.setAttribute('class', "light");
        btn.textContent = "Lighten";
        overlay.style.backgroundColor = "rgba(0,0,0,0.5)";
        return;
    }
}


btn.addEventListener('click', change);


/* Declaring the array of image filenames */

/* Declaring the alternative text for each image file */

/* Looping through images */

// const newImage = document.createElement('img');
// newImage.setAttribute('src', xxx);
// newImage.setAttribute('alt', xxx);
// thumbBar.appendChild(newImage);

/* Wiring up the Darken/Lighten button */
const img1 = ["pic1.jpg", "pic2.jpg", "pic3.jpg", "pic4.jpg", "pic5.jpg"];
img1.forEach(element => {
    const newImage = document.createElement('img');
    newImage.setAttribute('src', "images/" + element);
    newImage.setAttribute('alt', element);
    thumbBar.appendChild(newImage);
    newImage.addEventListener('click', () => {
        displayedImage.setAttribute('src', newImage.src)
    })
});

const small = document.querySelectorAll('.thumb-bar img');

if (small) {
    // 元素存在，可以安全地进行操作
    console.log('got');
} else {
    // 没有找到元素，可以在这里处理这种情况
    console.log('No image found');
}
// small.addEventListener("click", () => {
//     displayedImage.setAttribute('src', small.src)
// })

