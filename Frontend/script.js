const mouseFollower = document.querySelector(".mouse-follower")

let x = 0, y = 0;

addEventListener("mousemove", (e) => {
    const { clientX, clientY } = e
    x = clientX
    y = clientY
})

function far() {
    mouseFollower.style.transform = `translate(${x}px,${y}px)`
    console.log("hello")
    requestAnimationFrame(far)
}

far()