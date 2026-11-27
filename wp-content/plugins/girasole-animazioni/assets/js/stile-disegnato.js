/*!
 * Girasole – stile DISEGNATO A MANO: legato ai disegni a linea del sito.
 * Titoli che si "scrivono" da sinistra a destra, riga per riga, come una penna; poi una sottolineatura
 * a matita gialla (DrawSVG); divisori a onda che si tracciano mentre si scorre; il girasole a linea
 * (classe "girasole-disegno" su un contenitore) che si disegna da solo; foto che si posano come polaroid;
 * paragrafi in dissolvenza leggera.
 */
(function () {
	'use strict';
	if (!window.GirasoleAnim || !window.gsap) return;

	var NS = 'http://www.w3.org/2000/svg';
	// tratto a matita: una passata lunga e un ritorno più corto, un po' storti
	var MATITA = ['M3,7.5 C38,4.2 70,9.6 104,6.4 C138,3.6 168,8.2 197,5.6', 'M186,8.8 C150,10.4 112,8.6 62,10.2'];

	GirasoleAnim.stili.disegnato = function (A, radice) {
		var tel = A.telefono();
		var D = tel ? 0.8 : 1;
		var penna = !!window.DrawSVGPlugin;
		if (window.SplitText) gsap.registerPlugin(SplitText);
		if (penna) gsap.registerPlugin(DrawSVGPlugin);

		/* --- divisori a onda: si tracciano da sinistra a destra --- */
		Array.prototype.forEach.call(radice.querySelectorAll('.elementor-shape'), function (sh) {
			if (A.escluso(sh)) return;
			var da = { clipPath: 'inset(-2px 100% -2px 0%)' }, a = { clipPath: 'inset(-2px 0% -2px 0%)', ease: 'none' };
			if (sh.getBoundingClientRect().top < innerHeight) {
				gsap.fromTo(sh, da, Object.assign(a, { duration: 1.2, ease: 'power1.inOut', delay: 0.3, clearProps: 'clipPath' }));
			} else {
				gsap.fromTo(sh, da, Object.assign(a, {
					scrollTrigger: { trigger: sh, start: 'top bottom', end: tel ? 'top 70%' : 'top 55%', scrub: 0.6 }
				}));
			}
		});

		/* --- il girasole a linea --- */
		var modello = document.getElementById('gs-girasole');
		var girasoli = [];
		if (modello && penna) {
			Array.prototype.forEach.call(radice.querySelectorAll('.girasole-disegno'), function (c) {
				if (A.escluso(c)) return;
				var w = document.createElement('div');
				w.className = 'gs-girasole';
				w.setAttribute('aria-hidden', 'true');
				w.innerHTML = modello.innerHTML;
				c.appendChild(w);
				girasoli.push({ el: w, tipo: 'girasole', forte: true });
			});
		}

		/* --- sottolineatura a matita sotto l'ultima riga del titolo --- */
		function sottolinea(el) {
			var h = el.querySelector('.elementor-heading-title');
			var svg = document.createElementNS(NS, 'svg');
			svg.setAttribute('class', 'gs-matita');
			svg.setAttribute('viewBox', '0 0 200 14');
			svg.setAttribute('preserveAspectRatio', 'none');
			svg.setAttribute('aria-hidden', 'true');
			var tratti = MATITA.map(function (d) {
				var p = document.createElementNS(NS, 'path');
				p.setAttribute('d', d);
				p.setAttribute('vector-effect', 'non-scaling-stroke');
				svg.appendChild(p);
				return p;
			});
			if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
			el.appendChild(svg);
			function posiziona() {
				var rg = document.createRange();
				rg.selectNodeContents(h);
				var rr = Array.prototype.filter.call(rg.getClientRects(), function (r) { return r.width > 1; });
				if (!rr.length) return;
				var fondo = Math.max.apply(null, rr.map(function (r) { return r.bottom; }));
				var ultima = rr.filter(function (r) { return r.bottom > fondo - 4; });
				var sx = Math.min.apply(null, ultima.map(function (r) { return r.left; }));
				var dx = Math.max.apply(null, ultima.map(function (r) { return r.right; }));
				var e = el.getBoundingClientRect();
				svg.style.left = (sx - e.left) + 'px';
				svg.style.width = (dx - sx) + 'px';
				svg.style.top = (fondo - e.top - 2) + 'px';
			}
			posiziona();
			ScrollTrigger.addEventListener('refresh', posiziona);
			if (window.ResizeObserver) new ResizeObserver(posiziona).observe(el);
			gsap.set(tratti, { drawSVG: '0%' });
			gsap.timeline()
				.to(tratti[0], { drawSVG: '100%', duration: 0.6 * D, ease: 'power2.inOut' })
				.to(tratti[1], { drawSVG: '100%', duration: 0.4 * D, ease: 'power2.out' }, '-=0.1');
		}

		/* --- titolo scritto a penna: ogni riga si scopre da sinistra a destra, una dopo l'altra --- */
		function scrivi(el) {
			var h = el.querySelector('.elementor-heading-title');
			var split = SplitText.create(h, { type: 'lines', linesClass: 'gs-riga-penna' });
			gsap.set(el, { opacity: 1 });
			var tl = gsap.timeline({
				onComplete: function () {
					split.revert();
					gsap.set(el, { clearProps: 'opacity' });
					if (penna) sottolinea(el);
				}
			});
			split.lines.forEach(function (l) {
				var lr = l.getBoundingClientRect(), rg = document.createRange();
				rg.selectNodeContents(l);
				var tr = rg.getBoundingClientRect();
				var sx = Math.max(0, tr.left - lr.left - 6), dx = Math.max(0, lr.right - tr.right - 6);
				gsap.set(l, { clipPath: 'inset(-0.3em ' + (lr.width - sx).toFixed(1) + 'px -0.3em ' + sx.toFixed(1) + 'px)' });
				tl.to(l, {
					clipPath: 'inset(-0.3em ' + dx.toFixed(1) + 'px -0.3em ' + sx.toFixed(1) + 'px)',
					duration: gsap.utils.clamp(0.45, 1.1, 0.3 + tr.width / 900) * D,
					ease: 'power1.inOut'
				});
			});
		}

		/* --- foto come polaroid appoggiate: leggera rotazione che si raddrizza --- */
		var verso = 1;
		function polaroid(el) {
			gsap.set(el, { opacity: 1 });
			var pezzi;
			if (el.querySelector('.swiper-slide')) {
				// carosello: si posano le foto visibili, una dopo l'altra
				pezzi = Array.prototype.filter.call(el.querySelectorAll('.swiper-slide'), function (s) {
					var r = s.getBoundingClientRect();
					return r.right > 0 && r.left < innerWidth;
				}).slice(0, 5);
			} else {
				var img = el.classList.contains('elementor-widget-image') ? el.querySelector('img') : null;
				pezzi = [img || el];
			}
			var larga = pezzi.length === 1 && pezzi[0].getBoundingClientRect().width > innerWidth * 0.8;
			gsap.fromTo(pezzi, {
				opacity: 0, y: tel ? 24 : 40, scale: larga ? 1 : 0.95,
				rotation: function (i) { return larga ? 0 : (verso *= -1) * (3 + (i % 2) * 1.5); }
			}, {
				opacity: 1, y: 0, scale: 1, rotation: 0, duration: 1.0 * D, ease: 'power3.out',
				stagger: 0.12, clearProps: 'opacity,transform'
			});
		}

		/* --- il girasole si disegna: stelo, foglia, centro, poi i petali uno dopo l'altro --- */
		function disegnaGirasole(w) {
			var q = function (s) { return w.querySelectorAll(s + ' path'); };
			gsap.timeline()
				.to(q('.gs-stelo'), { drawSVG: '100%', duration: 0.9, ease: 'power1.inOut' })
				.to(q('.gs-foglia'), { drawSVG: '100%', duration: 0.7, ease: 'power1.inOut', stagger: 0.25 }, '-=0.2')
				.to(q('.gs-centro'), { drawSVG: '100%', duration: 0.8, ease: 'power1.inOut', stagger: 0.2 }, '-=0.3')
				.to(q('.gs-petali'), { drawSVG: '100%', duration: 0.5, ease: 'power1.out', stagger: 0.07 }, '-=0.3');
		}

		var items = A.ordina(A.raccogli(radice).concat(girasoli));
		A.regista(items, {
			passo: 0.2,
			prepara: function (it) {
				if (it.tipo === 'girasole') gsap.set(it.el.querySelectorAll('path'), { drawSVG: '0%' });
				else gsap.set(it.el, { opacity: 0 });
			},
			forte: function (it) {
				if (it.tipo === 'girasole') disegnaGirasole(it.el);
				else if (it.tipo === 'titolo' && window.SplitText) scrivi(it.el);
				else if (it.tipo === 'titolo') gsap.to(it.el, { opacity: 1, duration: 0.8, clearProps: 'opacity' });
				else polaroid(it.el);
			},
			leggero: function (it) {
				gsap.fromTo(it.el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8 * D, ease: 'power1.out', clearProps: 'opacity,transform' });
			}
		});
	};
})();
