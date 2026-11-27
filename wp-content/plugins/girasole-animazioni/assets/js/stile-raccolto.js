/*!
 * Girasole – stile RACCOLTO: più vivace, come una cesta che si riempie.
 * Titoli parola per parola con un leggero rimbalzo; sottotitoli e paragrafi che salgono a blocchi;
 * foto e caroselli che crescono mentre gli angoli si arrotondano; schede (gruppi di contenitori con
 * un'immagine) a cascata, con inclinazione al mouse se sono cliccabili; riquadri colorati (es. ORARI)
 * che "si accendono" riempiendosi di colore dal basso.
 */
(function () {
	'use strict';
	if (!window.GirasoleAnim || !window.gsap) return;

	GirasoleAnim.stili.raccolto = function (A, radice) {
		var tel = A.telefono();
		var D = tel ? 0.8 : 1;
		if (window.SplitText) gsap.registerPlugin(SplitText);
		var SALTO = 'back.out(1.7)';

		/* --- schede: contenitori fratelli (almeno 2) con una sola immagine e pochi widget --- */
		function eScheda(c) {
			var w = c.querySelectorAll('.elementor-widget');
			return !c.querySelector('.e-con') && w.length <= 3 && c.querySelectorAll('.elementor-widget-image').length === 1;
		}
		var schede = [];
		Array.prototype.forEach.call(radice.querySelectorAll('.e-con'), function (riga) {
			if (A.escluso(riga)) return;
			var figli = Array.prototype.slice.call(riga.querySelectorAll(':scope > .e-con, :scope > .e-con-inner > .e-con'));
			var buone = figli.filter(eScheda);
			if (buone.length >= 2 && buone.length === figli.length) schede = schede.concat(buone);
		});

		/* --- riquadri colorati: contenitori interni con un colore di fondo diverso da quello della sezione --- */
		function colore(el) {
			var c = getComputedStyle(el).backgroundColor;
			return /rgba\(.*,\s*0\)$|transparent/.test(c) ? null : c;
		}
		var riquadri = Array.prototype.filter.call(radice.querySelectorAll('.e-con.e-child'), function (c) {
			if (A.escluso(c) || schede.indexOf(c) > -1 || A.urlSfondo(c) || !c.querySelector('.elementor-widget')) return false;
			var col = colore(c);
			if (!col || col === 'rgb(255, 255, 255)') return false;
			var p = c.parentElement.closest('.e-con');
			while (p && !colore(p)) p = p.parentElement.closest('.e-con');
			return !p || colore(p) !== col;
		});

		var items = A.raccogli(radice).filter(function (it) {
			return !schede.some(function (s) { return s.contains(it.el); });
		});
		schede.forEach(function (s) { items.push({ el: s, tipo: 'scheda', forte: true }); });
		riquadri.forEach(function (r) { items.push({ el: r, tipo: 'riquadro', forte: true }); });
		A.ordina(items);

		/* --- foto: cresce e gli angoli si arrotondano (clip-path da angoli vivi al raggio finale) --- */
		function crescita(el, bersaglio, sale, poi) {
			var r = A.raggio(bersaglio) || 24, s = { k: 0 };
			function applica() {
				bersaglio.style.clipPath = 'inset(0 round ' + (r * s.k).toFixed(2) + 'px)';
			}
			applica();
			return gsap.timeline({ onComplete: function () { bersaglio.style.clipPath = ''; if (poi) poi(); } })
				.fromTo(el, { opacity: 0, scale: 0.88, y: sale || 0 }, { opacity: 1, scale: 1, y: 0, duration: 0.9 * D, ease: SALTO, clearProps: 'opacity,transform' }, 0)
				.to(s, { k: 1, duration: 0.9 * D, ease: 'power2.inOut', onUpdate: applica }, 0.1);
		}

		/* --- inclinazione al mouse delle schede cliccabili (solo computer) --- */
		function inclinazione(s) {
			if (!matchMedia('(hover: hover) and (min-width: 1025px)').matches || !s.querySelector('a')) return;
			gsap.set(s, { transformPerspective: 900 });
			var rx = gsap.quickTo(s, 'rotationX', { duration: 0.5, ease: 'power3' });
			var ry = gsap.quickTo(s, 'rotationY', { duration: 0.5, ease: 'power3' });
			s.addEventListener('mousemove', function (e) {
				var b = s.getBoundingClientRect();
				ry(((e.clientX - b.left) / b.width - 0.5) * 8);
				rx(-((e.clientY - b.top) / b.height - 0.5) * 8);
			});
			s.addEventListener('mouseleave', function () { rx(0); ry(0); });
		}

		/* --- riquadro che si accende: il colore sale dal basso --- */
		function accendi(el) {
			var col = colore(el), r = A.raggio(el);
			var fondo = document.createElement('div');
			fondo.className = 'gs-riempimento';
			fondo.style.backgroundColor = col;
			fondo.style.borderRadius = r + 'px';
			if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
			el.classList.add('gs-si-accende');
			el.style.transition = 'none'; // Elementor anima il colore di fondo: qui deve cambiare di colpo
			el.style.setProperty('background-color', 'transparent', 'important');
			el.insertBefore(fondo, el.firstChild);
			gsap.set(el, { opacity: 1 });
			gsap.fromTo(fondo, { clipPath: 'inset(100% 0% 0% 0%)' }, {
				clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 * D, ease: 'power2.inOut',
				onComplete: function () {
					el.style.removeProperty('background-color');
					requestAnimationFrame(function () {
						fondo.remove();
						el.classList.remove('gs-si-accende');
						setTimeout(function () { el.style.transition = ''; }, 50);
					});
				}
			});
		}

		A.regista(items, {
			passo: 0.16,
			prepara: function (it) { gsap.set(it.el, { opacity: 0 }); },
			forte: function (it) {
				var el = it.el;
				if (it.tipo === 'titolo' && window.SplitText) {
					var split = SplitText.create(el.querySelector('.elementor-heading-title'), { type: 'words' });
					gsap.set(el, { opacity: 1 });
					gsap.fromTo(split.words, { opacity: 0, y: '0.55em', rotation: 3 }, {
						opacity: 1, y: 0, rotation: 0, duration: 0.8 * D, ease: SALTO,
						stagger: function (i) { return Math.min(i, 10) * 0.05; },
						onComplete: function () { split.revert(); gsap.set(el, { clearProps: 'opacity' }); }
					});
				} else if (it.tipo === 'titolo') {
					gsap.to(el, { opacity: 1, duration: 0.8, clearProps: 'opacity' });
				} else if (it.tipo === 'scheda') {
					var img = el.querySelector('.elementor-widget-image img');
					crescita(el, img || el, tel ? 20 : 36, function () { inclinazione(el); });
				} else if (it.tipo === 'riquadro') {
					accendi(el);
				} else {
					var img2 = el.classList.contains('elementor-widget-image') ? el.querySelector('img') : null;
					crescita(el, img2 || el);
				}
			},
			leggero: function (it) {
				var b = A.blocchi(it.el);
				gsap.set(it.el, { opacity: 1 });
				gsap.fromTo(b, { opacity: 0, y: tel ? 14 : 22 }, {
					opacity: 1, y: 0, duration: 0.7 * D, ease: 'power3.out',
					stagger: function (i) { return Math.min(i, 4) * 0.08; },
					clearProps: 'opacity,transform',
					onComplete: function () { gsap.set(it.el, { clearProps: 'opacity' }); }
				});
			}
		});
	};
})();
