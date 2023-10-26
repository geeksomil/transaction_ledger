let redarea = document.getElementById("redarea");
let bluearea = document.getElementById("bluearea");
let greenarea = document.getElementById("greenarea");
let grids = document.getElementsByClassName("grid");
// for (x in grids) {
//   grids[x].innerHTML = grids[x].getAttribute("id");
// }
let flag = false;
let current, n;
let rank = 1;
let rankarr = [-1, -1, -1, -1];
function clickevent(event) {
  turn--;
  let id = event.target.id;
  id = id.slice(0, 3);
  current = document.getElementById(id);

  let idx = id[2] - 1;
  for (x in allowed) {
    document
      .getElementById(allowed[x])
      .removeEventListener("click", clickevent);
    let id = "#" + allowed[x];
    $(id).stop();
    document.getElementById(allowed[x]).style = {
      transform: "rotate('0deg')",
    };
  }
  let pos = arr[turn % 4].pos[idx];
  let flag = true;
  if (pos == -1) {
    pos = arr[turn % 4].start;
    flag = false;
  }
  console.log(pos);
  if (pos + n > arr[turn % 4].winlineStart + 5) {
    turn++;
    return;
  }
  if (flag) {
    let c = 0;
    let flag2 = false;
    let limit = pos + n;
    if (pos >= arr[turn % 4].winlineStart) flag2 = true;
    for (let i = 1; i <= n; i++) {
      let turn2 = turn;
      if (!flag2) {
        pos = (pos + 1) % 52;
        let element = document.getElementById(pos);

        setTimeout(() => {
          element.appendChild(current);
          if (i == n) {
            check(pos, id);
          }
        }, 500 * ++c);
      } else {
        if (pos + 1 == arr[turn % 4].winPoint) {
          pos++;
          if (arr[turn % 4].isWin(idx, rank)) {
            setTimeout(() => {
              document.getElementById(pos).appendChild(current);
              let innerhtml = `<image style='width:100%' src='crown${rank}.png'></image>`;
              console.log("bye" + (turn2 % 4));
              $("#" + arr[turn2 % 4].color).html(innerhtml);
              rankarr[rank - 1] = arr[turn2 % 4].color;
              arr[turn2 % 4].setRank(rank++);
            }, 500 * ++c);
          } else {
            setTimeout(() => {
              document.getElementById(pos).appendChild(current);
              console.log(pos);
            }, 500 * ++c);
          }
          break;
        }
        pos = pos + 1;
        let t = pos;
        setTimeout(() => {
          document.getElementById(t).appendChild(current);
        }, 500 * ++c);
      }
      if (pos % 52 == arr[turn % 4].end) {
        pos = arr[turn % 4].winlineStart - 1;
        flag2 = true;
      }
    }
    arr[turn % 4].changePosition(idx, pos);
    // if (!check(pos, id)) {
    //   document.getElementById(" " + id).appendChild(current);
    //   arr[turn % 4].changePosition(idx, -1);
    // }
    if (n != 6) turn++;
  } else {
    document.getElementById(pos % 52).appendChild(current);
    arr[turn % 4].changePosition(idx, pos % 52);
  }
}
function check(i, id) {
  let query = "[id ='" + i + "'] " + " > * ";
  let children = document.querySelectorAll(query);
  for (let it = 0; it < children.length; it++) {
    let t = children[it].getAttribute("id");
    if (t != id) {
      if (t == 0 || t == 13 || t == 26 || t == 39) continue;
      document.getElementById(" " + t).appendChild(document.getElementById(t));
      if (t[1] == "r") {
        arr[0].changePosition(t[2] - 1, -1);
      } else if ((t[1] = "b")) {
        arr[1].changePosition(t[2] - 1, -1);
      } else if (t[1] == "g") {
        arr[2].changePosition(t[2] - 1, -1);
      } else if (t[1] == "y") {
        arr[3].changePosition(t[2] - 1, -1);
      }
      return false;
    }
    return true;
  }
}
class Pawn {
  constructor(color, start, end, winlineStart) {
    this.color = color;
    let c = "p" + color[0];
    this.id = [c + 1, c + 2, c + 3, c + 4];
    this.pos = [-1, -1, -1, -1];
    this.start = start;
    this.end = end;
    this.winlineStart = winlineStart;
    this.winPoint = winlineStart + 5;
    this.rank = 0;
  }
  changePosition(pawn, x) {
    this.pos[pawn] = x;
  }
  out() {
    let result = [];
    for (let i = 0; i < 4; i++) {
      if (this.pos[i] != -1 && this.pos[i] != this.winPoint) {
        result.push(this.id[i]);
      }
    }
    return result;
  }
  setPosition() {
    for (let i = 0; i < 4; i++) {
      console.log(this.pos[i]);
      if (this.pos[i] != -1) {
        document
          .getElementById(this.pos[i])
          .appendChild(document.getElementById(this.id[i]));
      }
    }
  }
  in() {
    let result = [];
    for (let i = 0; i < 4; i++) {
      if (this.pos[i] == -1 && this.pos[i] != this.winPoint) {
        result.push(this.id[i]);
      }
    }
    return result;
  }
  isWin(pawn, rank) {
    this.pos[pawn] = this.winPoint; //PAWN IS INSIDE
    for (let i = 0; i < 4; i++) {
      if (this.pos[i] != this.winPoint) return false;
    }
    rankarr[rank - 1] = this.color;
    console.log(this.rank + "hello");
    if (rank == 3) {
      for (let i = 0; i < 4; i++) {
        if (arr[i].rank == 0) {
          rankarr[3] = arr[i].color;
        }
      }
      localStorage.setItem("rankarr", JSON.stringify(rankarr));
      window.location.href = "leaderboard.html";
    }
    return true;
  }
  setRank(rank) {
    this.rank = rank;
  }
}
document.getElementById("quit").onclick = (e) => {
  let element = document.getElementById("quitalert");
  element.style.display = "block";
};
document.getElementById("quityes").onclick = (e) => {
  window.location.href = "home.html";
};
document.getElementById("quitno").onclick = (e) => {
  let element = document.getElementById("quitalert");
  element.style.display = "none";
};
document.getElementById("save").onclick = () => {
  localStorage.setItem("arr", JSON.stringify(arr));
  console.log(localStorage.getItem("arr"));
};
document.getElementById("delete").onclick = () => {
  document.getElementById("deletealert").style.display = "block";
};
document.getElementById("delyes").onclick = (e) => {
  let element = document.getElementById("deletealert");
  element.style.display = "none";
  localStorage.removeItem("arr");
};
document.getElementById("delno").onclick = (e) => {
  let element = document.getElementById("deletealert");
  element.style.display = "none";
};

let red = new Pawn("red", 0, 50, 52);
let blue = new Pawn("blue", 39, 37, 70);
let green = new Pawn("green", 13, 11, 58);
let yellow = new Pawn("yellow", 26, 24, 64);
let arr = [red, blue, green, yellow];
let turn = 0;
let allowed;
let button = document.getElementById("roll");
function moving() {
  n = Math.floor(Math.random() * 6) + 1;
  n = 5;
  if (arr[turn % 4].rank != 0) {
    turn++;
    return;
  }
  diceWorking(n, arr[turn % 4].color);
  console.log(n);
  if (n == 6) {
    allowed = arr[turn % 4].id;
  } else {
    allowed = arr[turn % 4].out();
  }

  for (x in allowed) {
    document.getElementById(allowed[x]).addEventListener("click", clickevent);
    pawnAnimation(allowed[x], 180);
  }
  turn++;
}
// S
document.getElementsByClassName("dice")[0].onclick = moving;
function diceWorking(rnd, color) {
  $("#dice-color").val("#000000");
  $("#dot-color").val("#ffd700");
  let x, y;
  console.log("f");
  switch (rnd) {
    case 1:
      x = 720;
      y = 810;
      break;
    case 6:
      x = 720;
      y = 990;
      break;
    default:
      x = 720 + (6 - rnd) * 90;
      y = 900;
      break;
  }
  $(".dice").css(
    "transform",
    "translateZ(-100px) rotateY(" + x + "deg) rotateX(" + y + "deg)"
  );
  $(".dot").css("background-color", color);
}
for (let i = 0; i < 4; i++) {
  for (let j = 0; j < 4; j++) {
    if (arr[i].changePosition(j, arr[i].winlineStart));
    document
      .getElementById(arr[i].winlineStart)
      .appendChild(document.getElementById(arr[i].id[j]));
  }
}
window.onload = () => {
  if (localStorage.getItem("restart") == "true") {
    if (localStorage.getItem("arr") != null) {
      let t = JSON.parse(localStorage.getItem("arr"));
      for (let i = 0; i < 4; i++) {
        arr[i].pos = t[i].pos;
        arr[i].rank = t[i].rank;
        rank = max(arr[i].rank, rank);
        if (arr[i].rank != 0) {
          rankarr[arr[i].rank - 1] = arr[i].color;
        }
        if (arr[i]) arr[i].setPosition();
      }
    }
    localStorage.removeItem("arr");
  }
};
function pawnAnimation(idName, degree) {
  let idNameSelector = "#" + idName;
  $(idNameSelector).css({ transform: "rotate(0deg)" }); // Reset rotation
  $(idNameSelector).animate(
    { deg: degree }, // Rotate to 360 degrees (1 full rotation)
    {
      duration: 300, // Animation duration in milliseconds
      step: function (now) {
        $(this).css({
          transform: "rotate(" + now + "deg)",
        });
      },
      complete: function () {
        // Animation complete, restart the rotation
        degree += 180;
        pawnAnimation(idName, degree);
      },
    }
  );
}
pawnAnimation("pawn", 360);
