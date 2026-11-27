/*!
 * Girasole – stile BREZZA: calmo ed elegante.
 * Titoli che emergono riga per riga da una maschera; foto che si aprono come una tenda dal centro
 * con un leggero zoom indietro; parallasse morbido sulla hero; testi e pulsanti in breve dissolvenza verso l'alto.
 */
(function () {
	'use strict';
	if (!window.GirasoleAnim || !window.gsap) return;

	GirasoleAnim.stili.brezza = function (A, radice) {
		var tel = A.telefono();
		var D = tel ? 0.8 : 1; // sui telefoni tutto un po' più breve
		if (window.CustomEase) {
			gsap.registerPlugin(CustomEase);
			CustomEase.create('gs-brezza', 'M0,0 C0.22,1 0.36,1 1,1'); // parte decisa, si posa piano
		}
		var EASE = window.CustomEase ? 'gs-brezza' : 'expo.out';
		if (window.SplitText) gsap.registerPlugin(SplitText);

		// Hero: parallasse morbido sulla foto di sfondo della prima fascia (se non è già una finestra)
		var hero = A.sezioni(radice)[0];
		if (hero && !hero.classList.contains('gs-finestra') && A.contenitoreFoto(hero)) {
			A.parallasse(hero, null, tel ? 0.06 : 0.1, 'clamp(top bottom)');
		}

		// Foto: cosa ritagliare e se zoomare (il contenitore con figli non si zooma)
		function bersaglioFoto(it) {
			var el = it.el;
			if (el.classList.contains('elementor-widget-image') || el.classList.contains('elementor-widget-image-box')) {
				var img = el.querySelector('img');
				if (img) return { t: img, zoom: 1.12 };
			}
			if (el.classList.contains('e-con')) return { t: el, zoom: 1.08 };
			return { t: el, zoom: 1 }; // caroselli e gallerie: solo la tenda
		}

		function tenda(b, o, s, r) {
			// apertura "o" (0..1) dal centro; lo zoom "s" è compensato perché la tenda resti nel riquadro originale
			var ix = (0.5 - o * 0.5 / s) * 100, iy = (0.5 - 0.5 / s) * 100;
			b.style.clipPath = 'inset(' + iy.toFixed(3) + '% ' + ix.toFixed(3) + '% round ' + (r / s).toFixed(2) + 'px)';
			b.style.transform = s !== 1 ? 'scale(' + s.toFixed(4) + ')' : '';
		}

		A.regista(A.raccogli(radice), {
			passo: 0.2,
			prepara: function (it) {
				if (it.tipo === 'titolo' || it.tipo === 'foto') gsap.set(it.el, { opacity: 0 });
				else gsap.set(it.el, { opacity: 0, y: tel ? 10 : 14 });
			},
			forte: function (it) {
				var el = it.el;
				if (it.tipo === 'titolo' && window.SplitText) {
					var h = el.querySelector('.elementor-heading-title');
					var split = SplitText.create(h, { type: 'lines', mask: 'lines', linesClass: 'gs-riga' });
					gsap.set(el, { opacity: 1 });
					gsap.fromTo(split.lines, { yPercent: 115 }, {
						yPercent: 0, duration: 1.1 * D, ease: EASE,
						stagger: function (i) { return Math.min(i, 4) * 0.12; },
						onComplete: function () { split.revert(); gsap.set(el, { clearProps: 'opacity' }); }
					});
					return;
				}
				if (it.tipo === 'titolo') {
					gsap.to(el, { opacity: 1, duration: 0.9 * D, ease: EASE, clearProps: 'opacity' });
					return;
				}
				var b = bersaglioFoto(it), stato = { o: 0, s: b.zoom };
				var r = parseFloat(getComputedStyle(b.t).borderTopLeftRadius) || 0;
				tenda(b.t, 0, b.zoom, r);
				gsap.set(el, { opacity: 1 });
				gsap.to(stato, {
					o: 1, s: 1, duration: 1.2 * D, ease: EASE,
					onUpdate: function () { tenda(b.t, stato.o, stato.s, r); },
					onComplete: function () {
						b.t.style.clipPath = ''; b.t.style.transform = '';
						gsap.set(el, { clearProps: 'opacity' });
					}
				});
			},
			leggero: function (it) {
				gsap.to(it.el, { opacity: 1, y: 0, duration: 0.8 * D, ease: 'power2.out', clearProps: 'opacity,transform' });
			}
		});
	};
})();
